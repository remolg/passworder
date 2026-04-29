const path = require("node:path");

const {
  app,
  BrowserWindow,
  dialog,
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

const isHiddenLaunch = process.argv.includes("--hidden");
const UPDATE_CHECK_URL =
  "https://api.github.com/repos/remolg/passworder/releases/latest";
const UPDATE_RELEASE_URL = "https://github.com/remolg/passworder/releases/latest";
const UPDATE_CACHE_TTL_MS = 30 * 60 * 1000;

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

function normalizeVersion(version) {
  return String(version ?? "")
    .trim()
    .replace(/^v/i, "");
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

    updateInfoCache = {
      updateAvailable: Boolean(
        latestVersion && isNewerVersion(latestVersion, currentVersion),
      ),
      currentVersion,
      latestVersion,
      releaseUrl,
    };
  } catch {
    updateInfoCache = getUnavailableUpdateInfo();
  }

  updateInfoCheckedAt = now;
  return updateInfoCache;
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

function registerIpcHandlers() {
  ipcMain.handle("vault:get-status", async () =>
    vaultService.getStatus(getVaultStoragePath()),
  );
  ipcMain.handle("vault:initialize", async (_event, masterPassword) =>
    vaultService.initializeVault(getVaultStoragePath(), masterPassword),
  );
  ipcMain.handle("vault:unlock", async (_event, masterPassword) =>
    vaultService.unlockVault(getVaultStoragePath(), masterPassword),
  );
  ipcMain.handle("vault:lock", async () => vaultService.lockVault());
  ipcMain.handle("vault:save-entry", async (_event, input) =>
    vaultService.saveEntry(getVaultStoragePath(), input),
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

    return {
      completed: true,
      payload,
    };
  });
  ipcMain.handle("vault:reorder-entries", async (_event, entryIds) =>
    vaultService.reorderEntries(getVaultStoragePath(), entryIds),
  );
  ipcMain.handle("vault:delete-entry", async (_event, id) =>
    vaultService.deleteEntry(getVaultStoragePath(), id),
  );
  ipcMain.handle("vault:update-settings", async (_event, settings) =>
    vaultService.updateSettings(getVaultStoragePath(), settings),
  );
  ipcMain.handle("vault:change-master-password", async (_event, input) =>
    vaultService.changeMasterPassword(getVaultStoragePath(), input),
  );
  ipcMain.handle("vault:copy-to-clipboard", async (_event, value, clearAfterSeconds) =>
    vaultService.copyToClipboard(value, clearAfterSeconds),
  );
  ipcMain.handle("app:get-update-info", async () => getUpdateInfo());
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
});
