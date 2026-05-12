const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");

const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} = require("electron");

const vaultService = require("./vault-service.cjs");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let updateInfoCache = null;
let updateInfoCheckedAt = 0;
let updateDownloadState = {
  status: "idle",
  progress: 0,
};
let updateDownloadPromise = null;

const isHiddenLaunch = process.argv.includes("--hidden");
const UPDATE_CHECK_URL =
  "https://api.github.com/repos/remolg/passworder/releases/latest";
const UPDATE_RELEASE_URL = "https://github.com/remolg/passworder/releases/latest";
const UPDATE_CACHE_TTL_MS = 30 * 60 * 1000;
const UPDATE_DOWNLOAD_DIR = "updates";

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="56" fill="#0f172a"/>
  <path d="M128 36 52 68v58c0 48 31 78 76 94 45-16 76-46 76-94V68l-76-32Z" fill="#6366f1"/>
  <path d="M128 64 78 85v38c0 32 20 53 50 65 30-12 50-33 50-65V85l-50-21Z" fill="#111827" opacity=".85"/>
  <circle cx="128" cy="117" r="25" fill="#e0e7ff"/>
  <path d="M119 136h18l5 48h-28l5-48Z" fill="#e0e7ff"/>
</svg>`;

function getAppIcon() {
  const iconPath = path.join(__dirname, "..", "build", "icon.ico");
  const fileIcon = nativeImage.createFromPath(iconPath);

  if (!fileIcon.isEmpty()) {
    return fileIcon;
  }

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`,
  );
}

function getVaultStoragePath() {
  return path.join(app.getPath("userData"), "vault.enc.json");
}

function getDefaultExportPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(app.getPath("documents"), `passworder-export-${date}.json`);
}

function getUpdateDownloadDirectory() {
  return path.join(app.getPath("userData"), UPDATE_DOWNLOAD_DIR);
}

function normalizeVersion(version) {
  const value = String(version ?? "")
    .trim()
    .replace(/^v/i, "");
  return value.match(/\d+(?:\.\d+){0,3}/)?.[0] ?? value;
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".");
  const rightParts = normalizeVersion(right).split(".");
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number.parseInt(leftParts[index] ?? "0", 10) || 0;
    const rightValue = Number.parseInt(rightParts[index] ?? "0", 10) || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

function isNewerVersion(latestVersion, currentVersion) {
  return compareVersions(latestVersion, currentVersion) > 0;
}

function getReleaseAssetScore(assetName) {
  const name = String(assetName ?? "").toLocaleLowerCase("en-US");

  if (
    !name ||
    name.endsWith(".blockmap") ||
    name.endsWith(".yml") ||
    name.endsWith(".yaml") ||
    name.endsWith(".json") ||
    name.endsWith(".txt") ||
    name.endsWith(".sha512")
  ) {
    return 0;
  }

  if (process.platform === "win32") {
    if (name.includes("setup") && name.endsWith(".exe")) {
      return 100;
    }

    if (name.endsWith(".exe")) {
      return 90;
    }

    if (name.includes("portable") && name.endsWith(".zip")) {
      return 80;
    }

    if (name.endsWith(".zip")) {
      return 70;
    }

    if (name.endsWith(".msi")) {
      return 60;
    }
  }

  return 0;
}

function selectReleaseAsset(assets) {
  if (!Array.isArray(assets)) {
    return null;
  }

  return assets
    .map((asset) => ({
      asset,
      score: getReleaseAssetScore(asset?.name),
    }))
    .filter(({ asset, score }) => score > 0 && asset?.browser_download_url)
    .sort((left, right) => right.score - left.score)[0]?.asset ?? null;
}

function getUnavailableUpdateInfo() {
  return {
    updateAvailable: false,
    currentVersion: app.getVersion(),
    releaseUrl: UPDATE_RELEASE_URL,
  };
}

async function getUpdateInfo() {
  const now = Date.now();
  if (updateInfoCache && now - updateInfoCheckedAt < UPDATE_CACHE_TTL_MS) {
    return updateInfoCache;
  }

  const currentVersion = app.getVersion();

  try {
    const response = await fetch(UPDATE_CHECK_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Passworder Update Check",
      },
    });

    if (!response.ok) {
      throw new Error(`Update check failed: ${response.status}`);
    }

    const release = await response.json();
    const latestVersion = normalizeVersion(release?.tag_name);
    const releaseUrl =
      typeof release?.html_url === "string" ? release.html_url : UPDATE_RELEASE_URL;
    const downloadAsset = selectReleaseAsset(release?.assets);

    updateInfoCache = {
      updateAvailable: Boolean(
        latestVersion && isNewerVersion(latestVersion, currentVersion),
      ),
      currentVersion,
      latestVersion,
      releaseUrl,
      downloadUrl:
        typeof downloadAsset?.browser_download_url === "string"
          ? downloadAsset.browser_download_url
          : undefined,
      downloadName:
        typeof downloadAsset?.name === "string" ? downloadAsset.name : undefined,
    };
  } catch {
    updateInfoCache = getUnavailableUpdateInfo();
  }

  updateInfoCheckedAt = now;
  return updateInfoCache;
}

function toRendererUpdateDownloadState(state = updateDownloadState) {
  return {
    status: state.status,
    progress: state.progress,
    downloadName: state.downloadName,
    latestVersion: state.latestVersion,
    error: state.error,
  };
}

function broadcastUpdateDownloadState() {
  mainWindow?.webContents.send(
    "app:update-download-progress",
    toRendererUpdateDownloadState(),
  );
}

function setUpdateDownloadState(nextState) {
  updateDownloadState = {
    ...updateDownloadState,
    ...nextState,
  };
  broadcastUpdateDownloadState();
  return toRendererUpdateDownloadState();
}

function sanitizeDownloadName(name) {
  const safeName = String(name ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ");

  return safeName || "Passworder-Update.exe";
}

function validateUpdateDownloadUrl(downloadUrl) {
  try {
    const parsedUrl = new URL(downloadUrl);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function writeChunk(fileStream, chunk) {
  return new Promise((resolve) => {
    if (fileStream.write(Buffer.from(chunk))) {
      resolve();
      return;
    }

    fileStream.once("drain", resolve);
  });
}

function closeFileStream(fileStream) {
  return new Promise((resolve, reject) => {
    fileStream.once("error", reject);
    fileStream.end(resolve);
  });
}

async function downloadUpdateInstaller() {
  if (updateDownloadPromise) {
    return updateDownloadPromise;
  }

  updateDownloadPromise = doDownloadUpdateInstaller().finally(() => {
    updateDownloadPromise = null;
  });

  return updateDownloadPromise;
}

async function doDownloadUpdateInstaller() {
  const updateInfo = await getUpdateInfo();

  if (!updateInfo.updateAvailable || !updateInfo.downloadUrl) {
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: "errors.updateDownloadUnavailable",
    });
    throw new Error("errors.updateDownloadUnavailable");
  }

  if (!validateUpdateDownloadUrl(updateInfo.downloadUrl)) {
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: "errors.updateDownloadUnavailable",
    });
    throw new Error("errors.updateDownloadUnavailable");
  }

  const downloadDirectory = getUpdateDownloadDirectory();
  const downloadName = sanitizeDownloadName(updateInfo.downloadName);
  const downloadPath = path.join(downloadDirectory, downloadName);
  const temporaryPath = `${downloadPath}.download`;

  await fsPromises.mkdir(downloadDirectory, { recursive: true });
  await fsPromises.rm(temporaryPath, { force: true });

  setUpdateDownloadState({
    status: "downloading",
    progress: 0,
    downloadName,
    latestVersion: updateInfo.latestVersion,
    error: undefined,
    filePath: undefined,
  });

  const response = await fetch(updateInfo.downloadUrl, {
    headers: {
      "User-Agent": "Passworder Update Download",
    },
  });

  if (!response.ok || !response.body) {
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: "errors.updateDownloadFailed",
    });
    throw new Error("errors.updateDownloadFailed");
  }

  const totalBytes = Number(response.headers.get("content-length")) || 0;
  let receivedBytes = 0;
  let lastBroadcastAt = 0;
  const reader = response.body.getReader();
  const fileStream = fs.createWriteStream(temporaryPath);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      receivedBytes += value.byteLength;
      await writeChunk(fileStream, value);

      const progress = totalBytes
        ? Math.max(1, Math.min(99, Math.round((receivedBytes / totalBytes) * 100)))
        : 0;
      const now = Date.now();

      if (now - lastBroadcastAt > 250) {
        lastBroadcastAt = now;
        setUpdateDownloadState({
          status: "downloading",
          progress,
        });
      }
    }

    await closeFileStream(fileStream);
    await fsPromises.rm(downloadPath, { force: true });
    await fsPromises.rename(temporaryPath, downloadPath);

    return setUpdateDownloadState({
      status: "ready",
      progress: 100,
      downloadName,
      latestVersion: updateInfo.latestVersion,
      filePath: downloadPath,
      error: undefined,
    });
  } catch (error) {
    fileStream.destroy();
    await fsPromises.rm(temporaryPath, { force: true }).catch(() => {});
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: "errors.updateDownloadFailed",
    });
    throw error;
  }
}

async function installDownloadedUpdate() {
  if (updateDownloadState.status !== "ready" || !updateDownloadState.filePath) {
    throw new Error("errors.updateInstallerMissing");
  }

  await fsPromises.access(updateDownloadState.filePath);
  const launchError = await shell.openPath(updateDownloadState.filePath);

  if (launchError) {
    throw new Error("errors.updateInstallerLaunchFailed");
  }

  setUpdateDownloadState({
    status: "installing",
    progress: 100,
  });

  setTimeout(() => {
    isQuitting = true;
    app.quit();
  }, 1_000);

  return toRendererUpdateDownloadState();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 650,
    minWidth: 360,
    minHeight: 650,
    maxWidth: 360,
    maxHeight: 650,
    show: false,
    skipTaskbar: isHiddenLaunch,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    title: "Passworder",
    icon: getAppIcon(),
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    if (!isHiddenLaunch) {
      showMainWindow();
    }
  });

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    hideMainWindow();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindow();
  });
}

function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();
}

function createTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getAppIcon().resize({ width: 16, height: 16 }));
  tray.setToolTip("Passworder");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Passworder'ı aç", click: showMainWindow },
      { label: "Gizle", click: hideMainWindow },
      { type: "separator" },
      {
        label: "Tamamen kapat",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", showMainWindow);
}

function enableAutoLaunch() {
  if (process.defaultApp) {
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: true,
    args: ["--hidden"],
  });
}

const registeredEntryShortcuts = new Set();
let entryShortcutsSuspended = false;

function unregisterEntryShortcuts() {
  for (const accelerator of registeredEntryShortcuts) {
    globalShortcut.unregister(accelerator);
  }

  registeredEntryShortcuts.clear();
}

function refreshEntryShortcuts() {
  unregisterEntryShortcuts();

  if (entryShortcutsSuspended) {
    return;
  }

  for (const assignment of vaultService.getShortcutAssignments()) {
    if (assignment.kind !== "keyboard") {
      continue;
    }

    const registered = globalShortcut.register(assignment.accelerator, () => {
      if (entryShortcutsSuspended) {
        return;
      }

      void vaultService
        .copyEntrySecret(assignment.entryId, assignment.field)
        .then((copyEvent) => {
          if (copyEvent) {
            mainWindow?.webContents.send("vault:entry-secret-copied", copyEvent);
          }
        })
        .catch(() => {});
    });

    if (registered) {
      registeredEntryShortcuts.add(assignment.accelerator);
    }
  }
}

function setEntryShortcutsSuspended(suspended) {
  entryShortcutsSuspended = Boolean(suspended);

  if (entryShortcutsSuspended) {
    unregisterEntryShortcuts();
    return;
  }

  refreshEntryShortcuts();
}

function registerIpcHandlers() {
  ipcMain.handle("vault:get-status", async () =>
    vaultService.getStatus(getVaultStoragePath()),
  );
  ipcMain.handle("vault:initialize", async (_event, masterPassword) => {
    const payload = await vaultService.initializeVault(
      getVaultStoragePath(),
      masterPassword,
    );
    refreshEntryShortcuts();
    return payload;
  });
  ipcMain.handle("vault:unlock", async (_event, masterPassword) => {
    const payload = await vaultService.unlockVault(getVaultStoragePath(), masterPassword);
    refreshEntryShortcuts();
    return payload;
  });
  ipcMain.handle("vault:lock", async () => {
    await vaultService.lockVault();
    unregisterEntryShortcuts();
  });
  ipcMain.handle("vault:save-entry", async (_event, input) => {
    const payload = await vaultService.saveEntry(getVaultStoragePath(), input);
    refreshEntryShortcuts();
    return payload;
  });
  ipcMain.handle("vault:create-folder", async (_event, input) =>
    vaultService.createFolder(getVaultStoragePath(), input),
  );
  ipcMain.handle("vault:update-folder", async (_event, input) =>
    vaultService.updateFolder(getVaultStoragePath(), input),
  );
  ipcMain.handle("vault:delete-folder", async (_event, id) =>
    vaultService.deleteFolder(getVaultStoragePath(), id),
  );
  ipcMain.handle("vault:export-entries", async () => {
    const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
      defaultPath: getDefaultExportPath(),
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    });

    if (result.canceled || !result.filePath) {
      return { completed: false };
    }

    await vaultService.exportEntries(getVaultStoragePath(), result.filePath);
    return { completed: true };
  });
  ipcMain.handle("vault:import-entries", async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { completed: false };
    }

    const payload = await vaultService.importEntries(
      getVaultStoragePath(),
      result.filePaths[0],
    );

    refreshEntryShortcuts();

    return {
      completed: true,
      payload,
    };
  });
  ipcMain.handle("vault:reorder-entries", async (_event, entryIds) =>
    vaultService.reorderEntries(getVaultStoragePath(), entryIds),
  );
  ipcMain.handle("vault:reorder-folders", async (_event, folderIds) =>
    vaultService.reorderFolders(getVaultStoragePath(), folderIds),
  );
  ipcMain.handle("vault:delete-entry", async (_event, id) => {
    const payload = await vaultService.deleteEntry(getVaultStoragePath(), id);
    refreshEntryShortcuts();
    return payload;
  });
  ipcMain.handle("vault:update-settings", async (_event, settings) =>
    vaultService.updateSettings(getVaultStoragePath(), settings),
  );
  ipcMain.handle("vault:change-master-password", async (_event, input) => {
    const payload = await vaultService.changeMasterPassword(
      getVaultStoragePath(),
      input,
    );
    refreshEntryShortcuts();
    return payload;
  });
  ipcMain.handle("vault:copy-to-clipboard", async (_event, value, clearAfterSeconds) =>
    vaultService.copyToClipboard(value, clearAfterSeconds),
  );
  ipcMain.handle("shortcuts:set-suspended", async (_event, suspended) => {
    setEntryShortcutsSuspended(suspended);
  });
  ipcMain.on("shortcuts:set-suspended-sync", (event, suspended) => {
    setEntryShortcutsSuspended(suspended);
    event.returnValue = true;
  });
  ipcMain.handle("app:get-update-info", async () => getUpdateInfo());
  ipcMain.handle("app:get-update-download-state", async () =>
    toRendererUpdateDownloadState(),
  );
  ipcMain.handle("app:download-update", async () => downloadUpdateInstaller());
  ipcMain.handle("app:install-update", async () => installDownloadedUpdate());
  ipcMain.handle("window:minimize", async () => {
    mainWindow?.minimize();
  });
  ipcMain.handle("window:close", async () => {
    mainWindow?.close();
  });
  ipcMain.handle("window:open-external", async (_event, url) => {
    await shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  enableAutoLaunch();
  registerIpcHandlers();
  createMainWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on("second-instance", () => {
  showMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin" || tray) {
    return;
  }

  if (!isQuitting) {
    return;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  unregisterEntryShortcuts();
});
