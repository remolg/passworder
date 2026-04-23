const path = require("node:path");

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");

const vaultService = require("./vault-service.cjs");

let mainWindow = null;

function getVaultStoragePath() {
  return path.join(app.getPath("userData"), "vault.enc.json");
}

function getDefaultExportPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(app.getPath("documents"), `passworder-export-${date}.json`);
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
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    title: "Passworder",
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
    mainWindow?.show();
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
  ipcMain.handle("vault:copy-to-clipboard", async (_event, value, clearAfterSeconds) =>
    vaultService.copyToClipboard(value, clearAfterSeconds),
  );
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
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
