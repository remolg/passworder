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
const MIN_MASTER_PASSWORD_LENGTH = 3;

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
  const folders = normalizeFolders(payload?.folders);
  const folderIds = new Set(folders.map((folder) => folder.id));

  return {
    ...payload,
    entries: Array.isArray(payload?.entries)
      ? payload.entries.map((entry) => normalizeStoredEntry(entry, folderIds))
      : [],
    folders,
    settings: normalizeSettings(payload?.settings),
  };
}

function createEmptyPayload() {
  const now = isoNow();
  return {
    entries: [],
    folders: [],
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

function normalizeLogoId(logoId) {
  if (typeof logoId !== "string") {
    return undefined;
  }

  const trimmedLogoId = logoId.trim();
  return trimmedLogoId || undefined;
}

function normalizeFolderName(name) {
  return typeof name === "string" ? name.trim() : "";
}

function normalizeFolderNameKey(name) {
  return normalizeFolderName(name).toLocaleLowerCase("tr-TR");
}

function normalizeExistingFolderId(folderId, folderIds) {
  if (typeof folderId !== "string") {
    return undefined;
  }

  const trimmedFolderId = folderId.trim();
  return trimmedFolderId && folderIds.has(trimmedFolderId) ? trimmedFolderId : undefined;
}

function normalizeFolders(folders) {
  if (!Array.isArray(folders)) {
    return [];
  }

  const now = isoNow();
  const usedIds = new Set();
  const usedNames = new Set();
  const normalizedFolders = [];

  for (const folder of folders) {
    const name = normalizeFolderName(folder?.name);
    const nameKey = normalizeFolderNameKey(name);

    if (!name || usedNames.has(nameKey)) {
      continue;
    }

    let id = typeof folder?.id === "string" && folder.id.trim()
      ? folder.id.trim()
      : crypto.randomUUID();

    while (usedIds.has(id)) {
      id = crypto.randomUUID();
    }

    usedIds.add(id);
    usedNames.add(nameKey);
    normalizedFolders.push({
      id,
      name,
      logoId: normalizeLogoId(folder?.logoId),
      createdAt: typeof folder?.createdAt === "string" ? folder.createdAt : now,
      updatedAt: typeof folder?.updatedAt === "string" ? folder.updatedAt : now,
    });
  }

  return normalizedFolders;
}

function normalizeStoredEntry(entry, folderIds) {
  const now = isoNow();
  const folderId = normalizeExistingFolderId(entry?.folderId, folderIds);

  return {
    id: typeof entry?.id === "string" && entry.id ? entry.id : crypto.randomUUID(),
    service: typeof entry?.service === "string" ? entry.service : "",
    logoId: normalizeLogoId(entry?.logoId),
    folderId,
    username: typeof entry?.username === "string" ? entry.username : "",
    password: typeof entry?.password === "string" ? entry.password : "",
    url: typeof entry?.url === "string" ? entry.url : "",
    notes: typeof entry?.notes === "string" ? entry.notes : "",
    tags: Array.isArray(entry?.tags) ? normalizeTags(entry.tags) : [],
    createdAt: typeof entry?.createdAt === "string" ? entry.createdAt : now,
    updatedAt: typeof entry?.updatedAt === "string" ? entry.updatedAt : now,
  };
}

function cloneEntry(entry) {
  return {
    id: entry.id,
    service: entry.service,
    logoId: normalizeLogoId(entry.logoId),
    folderId: entry.folderId,
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function cloneFolder(folder) {
  return {
    id: folder.id,
    name: folder.name,
    logoId: normalizeLogoId(folder.logoId),
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

function validateMasterPassword(masterPassword) {
  if (!masterPassword || masterPassword.trim().length < MIN_MASTER_PASSWORD_LENGTH) {
    throw new Error("errors.masterPasswordTooShort");
  }
}

function verifyMasterPassword(key, verificationBlob) {
  try {
    const verification = decryptBytes(key, verificationBlob);
    return crypto.timingSafeEqual(verification, VERIFY_TOKEN);
  } catch {
    return false;
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

function validateFolderInput(input) {
  if (!normalizeFolderName(input?.name)) {
    throw new Error("errors.folderNameRequired");
  }
}

function ensureFolderNameAvailable(folders, name, ignoredFolderId) {
  const nameKey = normalizeFolderNameKey(name);
  const nameExists = folders.some(
    (folder) =>
      folder.id !== ignoredFolderId && normalizeFolderNameKey(folder.name) === nameKey,
  );

  if (nameExists) {
    throw new Error("errors.folderNameDuplicate");
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

function normalizeImportedFolder(folder) {
  if (!folder || typeof folder !== "object") {
    throw new Error("errors.importFileInvalid");
  }

  const name = normalizeFolderName(folder.name);
  if (!name) {
    throw new Error("errors.importFileInvalid");
  }

  const now = isoNow();

  return {
    id: typeof folder.id === "string" && folder.id ? folder.id : crypto.randomUUID(),
    name,
    logoId: normalizeLogoId(folder.logoId),
    createdAt: typeof folder.createdAt === "string" ? folder.createdAt : now,
    updatedAt: typeof folder.updatedAt === "string" ? folder.updatedAt : now,
  };
}

function normalizeImportedEntry(entry, folderIds) {
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
    logoId: normalizeLogoId(entry.logoId),
    folderId: normalizeExistingFolderId(entry.folderId, folderIds),
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

  const folders = Array.isArray(parsed?.folders)
    ? normalizeFolders(parsed.folders.map((folder) => normalizeImportedFolder(folder)))
    : [];
  const folderIds = new Set(folders.map((folder) => folder.id));

  return {
    entries: parsed.entries.map((entry) => normalizeImportedEntry(entry, folderIds)),
    folders,
  };
}

function resolveEntryFolderId(input, existingEntry, folderIds) {
  if (typeof input.folderId !== "string") {
    return existingEntry?.folderId;
  }

  const folderId = input.folderId.trim();
  if (!folderId) {
    return undefined;
  }

  if (!folderIds.has(folderId)) {
    throw new Error("errors.folderNotFound");
  }

  return folderId;
}

function buildEntry(input, existingEntry, folderIds) {
  const now = isoNow();
  const folderId = resolveEntryFolderId(input, existingEntry, folderIds);

  return {
    id: existingEntry?.id ?? crypto.randomUUID(),
    service: input.service.trim(),
    logoId: normalizeLogoId(input.logoId),
    folderId,
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

  if (!verifyMasterPassword(key, vaultFile.verification)) {
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
  const folderIds = new Set(currentSession.payload.folders.map((folder) => folder.id));

  if (input.id) {
    const index = currentSession.payload.entries.findIndex((entry) => entry.id === input.id);
    if (index === -1) {
      throw new Error("errors.entryNotFoundUpdate");
    }

    currentSession.payload.entries[index] = buildEntry(
      input,
      currentSession.payload.entries[index],
      folderIds,
    );
  } else {
    currentSession.payload.entries.unshift(buildEntry(input, undefined, folderIds));
  }

  await persistSession(storagePath);
  return currentSession.payload;
}

async function createFolder(storagePath, input) {
  validateFolderInput(input);

  const currentSession = ensureUnlockedSession();
  const name = normalizeFolderName(input.name);
  ensureFolderNameAvailable(currentSession.payload.folders, name);

  const now = isoNow();
  currentSession.payload.folders.unshift({
    id: crypto.randomUUID(),
    name,
    logoId: normalizeLogoId(input.logoId),
    createdAt: now,
    updatedAt: now,
  });

  await persistSession(storagePath);
  return currentSession.payload;
}

async function updateFolder(storagePath, input) {
  validateFolderInput(input);

  const currentSession = ensureUnlockedSession();
  const folderId = typeof input?.id === "string" ? input.id.trim() : "";
  const folderIndex = currentSession.payload.folders.findIndex(
    (folder) => folder.id === folderId,
  );

  if (folderIndex === -1) {
    throw new Error("errors.folderNotFound");
  }

  const existingFolder = currentSession.payload.folders[folderIndex];
  const name = normalizeFolderName(input.name);
  ensureFolderNameAvailable(currentSession.payload.folders, name, existingFolder.id);

  currentSession.payload.folders[folderIndex] = {
    ...existingFolder,
    name,
    logoId: normalizeLogoId(input.logoId),
    updatedAt: isoNow(),
  };

  await persistSession(storagePath);
  return currentSession.payload;
}

async function deleteFolder(storagePath, id) {
  const currentSession = ensureUnlockedSession();
  const folderIndex = currentSession.payload.folders.findIndex(
    (folder) => folder.id === id,
  );

  if (folderIndex === -1) {
    throw new Error("errors.folderNotFound");
  }

  currentSession.payload.folders.splice(folderIndex, 1);
  currentSession.payload.entries = currentSession.payload.entries.map((entry) =>
    entry.folderId === id
      ? {
          ...entry,
          folderId: undefined,
          updatedAt: isoNow(),
        }
      : entry,
  );

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
    folders: currentSession.payload.folders.map((folder) => cloneFolder(folder)),
    entries: currentSession.payload.entries.map((entry) => cloneEntry(entry)),
  };

  await fs.writeFile(exportPath, JSON.stringify(exportPayload, null, 2), "utf8");
}

async function importEntries(storagePath, importPath) {
  const currentSession = ensureUnlockedSession();
  const fileContent = await fs.readFile(importPath, "utf8");
  const importedPayload = parseImportFile(fileContent);
  const currentFolders = currentSession.payload.folders.slice();
  const folderIndexById = new Map(
    currentFolders.map((folder, index) => [folder.id, index]),
  );
  const folderIdByName = new Map(
    currentFolders.map((folder) => [normalizeFolderNameKey(folder.name), folder.id]),
  );
  const importedFolderIdMap = new Map();

  for (const importedFolder of importedPayload.folders) {
    const nameKey = normalizeFolderNameKey(importedFolder.name);
    const existingIdForName = folderIdByName.get(nameKey);

    if (existingIdForName && existingIdForName !== importedFolder.id) {
      importedFolderIdMap.set(importedFolder.id, existingIdForName);
      continue;
    }

    const existingIndex = folderIndexById.get(importedFolder.id);
    if (existingIndex === undefined) {
      currentFolders.push(importedFolder);
      folderIndexById.set(importedFolder.id, currentFolders.length - 1);
      folderIdByName.set(nameKey, importedFolder.id);
    } else {
      currentFolders[existingIndex] = importedFolder;
      folderIdByName.set(nameKey, importedFolder.id);
    }

    importedFolderIdMap.set(importedFolder.id, importedFolder.id);
  }

  const importedEntries = importedPayload.entries.map((entry) => ({
    ...entry,
    folderId: entry.folderId ? importedFolderIdMap.get(entry.folderId) : undefined,
  }));
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

  currentSession.payload.folders = currentFolders;
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

async function changeMasterPassword(storagePath, input) {
  const currentPassword =
    typeof input?.currentPassword === "string" ? input.currentPassword : "";
  const nextPassword = typeof input?.nextPassword === "string" ? input.nextPassword : "";

  if (!currentPassword.trim()) {
    throw new Error("errors.currentPasswordRequired");
  }

  if (!nextPassword.trim()) {
    throw new Error("errors.newMasterPasswordRequired");
  }

  validateMasterPassword(nextPassword);

  const currentSession = ensureUnlockedSession();
  const vaultFile = await readVaultFile(storagePath);
  const currentKey = deriveKey(currentPassword, vaultFile.kdf);

  if (!verifyMasterPassword(currentKey, vaultFile.verification)) {
    currentKey.fill(0);
    throw new Error("errors.masterPasswordInvalid");
  }

  currentSession.payload.updatedAt = isoNow();
  currentSession.payload.settings = normalizeSettings(currentSession.payload.settings);

  const nextKdf = createKdfConfig();
  const nextKey = deriveKey(nextPassword, nextKdf);

  vaultFile.kdf = nextKdf;
  vaultFile.verification = encryptBytes(nextKey, VERIFY_TOKEN);
  vaultFile.vault = encryptJson(nextKey, currentSession.payload);
  vaultFile.updatedAt = currentSession.payload.updatedAt;

  await writeVaultFile(storagePath, vaultFile);

  currentKey.fill(0);
  clearSession();
  session = createSession(nextKey, currentSession.payload);
  nextKey.fill(0);

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
  createFolder,
  updateFolder,
  deleteFolder,
  exportEntries,
  importEntries,
  reorderEntries,
  deleteEntry,
  updateSettings,
  changeMasterPassword,
  copyToClipboard,
};
