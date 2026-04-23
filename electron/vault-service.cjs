const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const { clipboard } = require("electron");

const DEFAULT_SETTINGS = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  language: "en",
};

const VERIFY_TOKEN = Buffer.from("passworder:master-key-check:v1", "utf8");
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const EXPORT_TYPE = "passworder.entries.export";
const EXPORT_VERSION = 1;

let session = null;

function isoNow() {
  return new Date().toISOString();
}

function normalizeSettings(settings = {}) {
  return {
    autoLockMinutes: Math.min(120, Math.max(1, Number(settings.autoLockMinutes) || 5)),
    clipboardClearSeconds: Math.min(
      180,
      Math.max(5, Number(settings.clipboardClearSeconds) || 30),
    ),
    language: settings.language === "tr" ? "tr" : "en",
  };
}

function normalizePayload(payload) {
  return {
    ...payload,
    settings: normalizeSettings(payload?.settings),
  };
}

function createEmptyPayload() {
  const now = isoNow();
  return {
    entries: [],
    settings: normalizeSettings(DEFAULT_SETTINGS),
    createdAt: now,
    updatedAt: now,
  };
}

function randomBase64(size) {
  return crypto.randomBytes(size).toString("base64");
}

function deriveKey(masterPassword, kdf) {
  return crypto.scryptSync(masterPassword, Buffer.from(kdf.saltB64, "base64"), kdf.keyLength, {
    N: kdf.cost,
    r: kdf.blockSize,
    p: kdf.parallelization,
    maxmem: 256 * 1024 * 1024,
  });
}

function createKdfConfig() {
  return {
    algorithm: "scrypt",
    cost: 32768,
    blockSize: 8,
    parallelization: 1,
    keyLength: KEY_LENGTH,
    saltB64: randomBase64(32),
  };
}

function encryptBytes(key, plaintext) {
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    nonceB64: nonce.toString("base64"),
    ciphertextB64: ciphertext.toString("base64"),
    authTagB64: tag.toString("base64"),
  };
}

function decryptBytes(key, encryptedBlob) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedBlob.nonceB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encryptedBlob.authTagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBlob.ciphertextB64, "base64")),
    decipher.final(),
  ]);
}

function encryptJson(key, value) {
  return encryptBytes(key, Buffer.from(JSON.stringify(value), "utf8"));
}

function decryptJson(key, value) {
  return JSON.parse(decryptBytes(key, value).toString("utf8"));
}

async function ensureDirectory(storagePath) {
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
}

async function writeVaultFile(storagePath, fileContent) {
  await ensureDirectory(storagePath);
  const temporaryPath = `${storagePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(fileContent, null, 2), "utf8");

  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.rename(temporaryPath, storagePath);
}

async function readVaultFile(storagePath) {
  const content = await fs.readFile(storagePath, "utf8");
  return JSON.parse(content);
}

function createSession(key, payload) {
  return {
    key: Buffer.from(key),
    payload: normalizePayload(payload),
  };
}

function clearSession() {
  if (session?.key) {
    session.key.fill(0);
  }
  session = null;
}

function ensureUnlockedSession() {
  if (!session) {
    throw new Error("errors.vaultLocked");
  }

  return session;
}

function normalizeTags(tags) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

function cloneEntry(entry) {
  return {
    id: entry.id,
    service: entry.service,
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function validateMasterPassword(masterPassword) {
  if (!masterPassword || masterPassword.trim().length < 12) {
    throw new Error("errors.masterPasswordTooShort");
  }
}

function validateEntryInput(input) {
  if (!input.service?.trim()) {
    throw new Error("errors.entryServiceRequired");
  }

  if (!input.password) {
    throw new Error("errors.entryPasswordRequired");
  }
}

function validateEntryOrder(entryIds, entries) {
  if (!Array.isArray(entryIds) || entryIds.length !== entries.length) {
    throw new Error("errors.unexpected");
  }

  const currentIds = new Set(entries.map((entry) => entry.id));
  if (currentIds.size !== entryIds.length) {
    throw new Error("errors.unexpected");
  }

  for (const entryId of entryIds) {
    if (typeof entryId !== "string" || !currentIds.has(entryId)) {
      throw new Error("errors.unexpected");
    }
  }
}

function normalizeImportedEntry(entry) {
  if (!entry || typeof entry !== "object") {
    throw new Error("errors.importFileInvalid");
  }

  const service = typeof entry.service === "string" ? entry.service.trim() : "";
  const password = typeof entry.password === "string" ? entry.password : "";

  if (!service || !password) {
    throw new Error("errors.importFileInvalid");
  }

  const now = isoNow();

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : crypto.randomUUID(),
    service,
    username: typeof entry.username === "string" ? entry.username.trim() : "",
    password,
    url: typeof entry.url === "string" ? entry.url.trim() : "",
    notes: typeof entry.notes === "string" ? entry.notes.trim() : "",
    tags: Array.isArray(entry.tags) ? normalizeTags(entry.tags) : [],
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : now,
  };
}

function parseImportFile(fileContent) {
  let parsed;

  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error("errors.importFileInvalid");
  }

  if (
    parsed?.type !== EXPORT_TYPE ||
    parsed?.version !== EXPORT_VERSION ||
    !Array.isArray(parsed?.entries)
  ) {
    throw new Error("errors.importFileInvalid");
  }

  return parsed.entries.map((entry) => normalizeImportedEntry(entry));
}

function buildEntry(input, existingEntry) {
  const now = isoNow();

  return {
    id: existingEntry?.id ?? crypto.randomUUID(),
    service: input.service.trim(),
    username: input.username.trim(),
    password: input.password,
    url: input.url.trim(),
    notes: input.notes.trim(),
    tags: normalizeTags(input.tags),
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
  };
}

async function persistSession(storagePath) {
  const currentSession = ensureUnlockedSession();
  const vaultFile = await readVaultFile(storagePath);

  currentSession.payload.updatedAt = isoNow();
  currentSession.payload.settings = normalizeSettings(currentSession.payload.settings);
  vaultFile.vault = encryptJson(currentSession.key, currentSession.payload);
  vaultFile.updatedAt = currentSession.payload.updatedAt;

  await writeVaultFile(storagePath, vaultFile);
}

async function getStatus(storagePath) {
  let exists = true;

  try {
    await fs.access(storagePath);
  } catch {
    exists = false;
  }

  return {
    vaultExists: exists,
    isUnlocked: Boolean(session),
    defaultAutoLockMinutes: DEFAULT_SETTINGS.autoLockMinutes,
    storagePath,
  };
}

async function initializeVault(storagePath, masterPassword) {
  validateMasterPassword(masterPassword);

  try {
    await fs.access(storagePath);
    throw new Error("errors.vaultAlreadyExists");
  } catch (error) {
    if (error && error.message === "errors.vaultAlreadyExists") {
      throw error;
    }

    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const kdf = createKdfConfig();
  const key = deriveKey(masterPassword, kdf);
  const payload = createEmptyPayload();

  const vaultFile = {
    version: 1,
    kdf,
    cipher: "aes-256-gcm",
    verification: encryptBytes(key, VERIFY_TOKEN),
    vault: encryptJson(key, payload),
    updatedAt: payload.updatedAt,
  };

  await writeVaultFile(storagePath, vaultFile);
  clearSession();
  session = createSession(key, payload);
  key.fill(0);

  return payload;
}

async function unlockVault(storagePath, masterPassword) {
  const vaultFile = await readVaultFile(storagePath);
  const key = deriveKey(masterPassword, vaultFile.kdf);

  try {
    const verification = decryptBytes(key, vaultFile.verification);
    if (!crypto.timingSafeEqual(verification, VERIFY_TOKEN)) {
      throw new Error("errors.masterPasswordInvalid");
    }
  } catch {
    key.fill(0);
    throw new Error("errors.masterPasswordInvalid");
  }

  const payload = normalizePayload(decryptJson(key, vaultFile.vault));
  clearSession();
  session = createSession(key, payload);
  key.fill(0);

  return payload;
}

async function lockVault() {
  clearSession();
}

async function saveEntry(storagePath, input) {
  validateEntryInput(input);

  const currentSession = ensureUnlockedSession();
  if (input.id) {
    const index = currentSession.payload.entries.findIndex((entry) => entry.id === input.id);
    if (index === -1) {
      throw new Error("errors.entryNotFoundUpdate");
    }

    currentSession.payload.entries[index] = buildEntry(
      input,
      currentSession.payload.entries[index],
    );
  } else {
    currentSession.payload.entries.unshift(buildEntry(input));
  }

  await persistSession(storagePath);
  return currentSession.payload;
}

async function exportEntries(storagePath, exportPath) {
  const currentSession = ensureUnlockedSession();
  const exportPayload = {
    type: EXPORT_TYPE,
    version: EXPORT_VERSION,
    app: "Passworder",
    exportedAt: isoNow(),
    entries: currentSession.payload.entries.map((entry) => cloneEntry(entry)),
  };

  await fs.writeFile(exportPath, JSON.stringify(exportPayload, null, 2), "utf8");
}

async function importEntries(storagePath, importPath) {
  const currentSession = ensureUnlockedSession();
  const fileContent = await fs.readFile(importPath, "utf8");
  const importedEntries = parseImportFile(fileContent);
  const currentEntries = currentSession.payload.entries.slice();
  const currentIndexById = new Map(
    currentEntries.map((entry, index) => [entry.id, index]),
  );

  for (const importedEntry of importedEntries) {
    const existingIndex = currentIndexById.get(importedEntry.id);

    if (existingIndex === undefined) {
      currentEntries.push(importedEntry);
      currentIndexById.set(importedEntry.id, currentEntries.length - 1);
      continue;
    }

    currentEntries[existingIndex] = importedEntry;
  }

  currentSession.payload.entries = currentEntries;

  await persistSession(storagePath);
  return currentSession.payload;
}

async function reorderEntries(storagePath, entryIds) {
  const currentSession = ensureUnlockedSession();
  validateEntryOrder(entryIds, currentSession.payload.entries);

  const entriesById = new Map(
    currentSession.payload.entries.map((entry) => [entry.id, entry]),
  );

  currentSession.payload.entries = entryIds.map((entryId) => entriesById.get(entryId));

  await persistSession(storagePath);
  return currentSession.payload;
}

async function deleteEntry(storagePath, id) {
  const currentSession = ensureUnlockedSession();
  const originalLength = currentSession.payload.entries.length;
  currentSession.payload.entries = currentSession.payload.entries.filter((entry) => entry.id !== id);

  if (currentSession.payload.entries.length === originalLength) {
    throw new Error("errors.entryNotFoundDelete");
  }

  await persistSession(storagePath);
  return currentSession.payload;
}

async function updateSettings(storagePath, settings) {
  const currentSession = ensureUnlockedSession();
  currentSession.payload.settings = normalizeSettings({
    ...currentSession.payload.settings,
    ...settings,
  });

  await persistSession(storagePath);
  return currentSession.payload;
}

async function copyToClipboard(value, clearAfterSeconds) {
  clipboard.writeText(value);

  const timer = setTimeout(() => {
    if (clipboard.readText() === value) {
      clipboard.clear();
    }
  }, clearAfterSeconds * 1000);

  timer.unref?.();
}

module.exports = {
  getStatus,
  initializeVault,
  unlockVault,
  lockVault,
  saveEntry,
  exportEntries,
  importEntries,
  reorderEntries,
  deleteEntry,
  updateSettings,
  copyToClipboard,
};
