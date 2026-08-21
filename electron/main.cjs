const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");

const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} = require("electron");

const vaultService = require("./vault-service.cjs");
const windowAnchor = require("./window-anchor.cjs");

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
const UPDATE_STAGING_DIR = "staged";
const UPDATE_APPLY_SCRIPT = "apply-update.ps1";
const UPDATE_APPLY_SCRIPT_MAC = "apply-update.sh";

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
  const iconNames =
    process.platform === "darwin"
      ? ["icon.icns", "icon.png", "icon.ico"]
      : ["icon.ico", "icon.png", "icon.icns"];

  for (const iconName of iconNames) {
    const fileIcon = nativeImage.createFromPath(
      path.join(__dirname, "..", "build", iconName),
    );

    if (!fileIcon.isEmpty()) {
      return fileIcon;
    }
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

function toTransferErrorKey(error) {
  if (error instanceof Error && error.message.startsWith("errors.")) {
    return error.message;
  }

  return "errors.unexpected";
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
    name.endsWith(".sha256") ||
    name.endsWith(".sha512")
  ) {
    return 0;
  }

  if (process.platform === "win32") {
    if (name.includes("portable") && name.endsWith(".zip")) {
      return 100;
    }

    if (name.endsWith(".zip")) {
      return 80;
    }
  }

  if (process.platform === "darwin") {
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const matchesArch = name.includes(arch);
    const isUniversal = name.includes("universal");
    const isMacBuild =
      name.includes("mac") || name.includes("darwin") || name.includes("osx");

    if (name.endsWith(".zip") && matchesArch) {
      return 100;
    }

    if (name.endsWith(".zip") && isUniversal) {
      return 95;
    }

    if (name.endsWith(".zip") && isMacBuild) {
      return 70;
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

function getChecksumAssetScore(asset, downloadName) {
  const name = String(asset?.name ?? "").toLocaleLowerCase("en-US");
  const targetName = String(downloadName ?? "").toLocaleLowerCase("en-US");

  if (!name || !targetName || !asset?.browser_download_url) {
    return 0;
  }

  if (name === `${targetName}.sha256`) {
    return 100;
  }

  if (name === `${targetName}.sha512`) {
    return 90;
  }

  if (name === `${targetName}.sha256.txt`) {
    return 80;
  }

  if (name === `${targetName}.sha512.txt`) {
    return 70;
  }

  if (
    name.endsWith(".txt") &&
    (name.includes("checksum") || name.includes("sha256") || name.includes("sha512"))
  ) {
    return 40;
  }

  return 0;
}

function selectChecksumAsset(assets, downloadName) {
  if (!Array.isArray(assets) || !downloadName) {
    return null;
  }

  return assets
    .map((asset) => ({
      asset,
      score: getChecksumAssetScore(asset, downloadName),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)[0]?.asset ?? null;
}

function parseAssetDigest(asset) {
  const digest = String(asset?.digest ?? "").trim();
  const match = digest.match(/^(sha256|sha512):([a-f0-9]+)$/i);

  if (!match) {
    return null;
  }

  return {
    algorithm: match[1].toLocaleLowerCase("en-US"),
    value: match[2].toLocaleLowerCase("en-US"),
  };
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
    const downloadName =
      typeof downloadAsset?.name === "string" ? downloadAsset.name : undefined;
    const checksumAsset = downloadName
      ? selectChecksumAsset(release?.assets, downloadName)
      : null;
    const assetDigest = parseAssetDigest(downloadAsset);

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
      downloadName,
      checksumAlgorithm: assetDigest?.algorithm,
      checksumValue: assetDigest?.value,
      checksumUrl:
        typeof checksumAsset?.browser_download_url === "string"
          ? checksumAsset.browser_download_url
          : undefined,
      checksumName:
        typeof checksumAsset?.name === "string" ? checksumAsset.name : undefined,
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

  return safeName || "Passworder-Update.zip";
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

function calculateFileHash(filePath, algorithm) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

function parseChecksumText(text, downloadName, expectedAlgorithm) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targetName = String(downloadName ?? "").toLocaleLowerCase("en-US");
  const algorithms = expectedAlgorithm
    ? [expectedAlgorithm]
    : ["sha256", "sha512"];

  for (const line of lines) {
    const lowerLine = line.toLocaleLowerCase("en-US");
    const referencesDownload = targetName ? lowerLine.includes(targetName) : false;

    for (const algorithm of algorithms) {
      const length = algorithm === "sha512" ? 128 : 64;
      const match = line.match(new RegExp(`\\b([a-fA-F0-9]{${length}})\\b`));

      if (match && (referencesDownload || lines.length === 1)) {
        return {
          algorithm,
          value: match[1].toLocaleLowerCase("en-US"),
        };
      }
    }
  }

  return null;
}

function inferChecksumAlgorithm(name) {
  const lowerName = String(name ?? "").toLocaleLowerCase("en-US");

  if (lowerName.includes("sha512")) {
    return "sha512";
  }

  if (lowerName.includes("sha256")) {
    return "sha256";
  }

  return undefined;
}

async function resolveExpectedChecksum(updateInfo) {
  if (updateInfo.checksumAlgorithm && updateInfo.checksumValue) {
    return {
      algorithm: updateInfo.checksumAlgorithm,
      value: updateInfo.checksumValue,
    };
  }

  if (!updateInfo.checksumUrl || !validateUpdateDownloadUrl(updateInfo.checksumUrl)) {
    return null;
  }

  const response = await fetch(updateInfo.checksumUrl, {
    headers: {
      "User-Agent": "Passworder Update Checksum",
    },
  });

  if (!response.ok) {
    throw new Error("errors.updateVerificationFailed");
  }

  const checksumText = await response.text();
  return parseChecksumText(
    checksumText,
    updateInfo.downloadName,
    inferChecksumAlgorithm(updateInfo.checksumName),
  );
}

async function verifyDownloadedUpdatePackage(downloadPath, updateInfo) {
  const expectedChecksum = await resolveExpectedChecksum(updateInfo);

  if (!expectedChecksum) {
    throw new Error("errors.updateVerificationFailed");
  }

  const actualChecksum = await calculateFileHash(
    downloadPath,
    expectedChecksum.algorithm,
  );

  if (actualChecksum !== expectedChecksum.value) {
    throw new Error("errors.updateVerificationFailed");
  }
}

function runHiddenPowerShell(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", args, {
      windowsHide: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`PowerShell exited with code ${code}`));
    });
  });
}

function runHiddenProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function expandUpdateArchive(archivePath, destinationPath) {
  if (process.platform === "darwin") {
    await runHiddenProcess("/usr/bin/ditto", ["-xk", archivePath, destinationPath]);
    return;
  }

  await runHiddenPowerShell([
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "& { param($ArchivePath, $DestinationPath) Expand-Archive -LiteralPath $ArchivePath -DestinationPath $DestinationPath -Force }",
    archivePath,
    destinationPath,
  ]);
}

async function pathExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findExtractedAppDirectory(extractDirectory) {
  if (process.platform === "darwin") {
    return findExtractedMacApp(extractDirectory);
  }

  const exeName = path.basename(process.execPath);
  const candidates = [extractDirectory];
  const entries = await fsPromises.readdir(extractDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      candidates.push(path.join(extractDirectory, entry.name));
    }
  }

  for (const candidate of candidates) {
    if (
      (await pathExists(path.join(candidate, exeName))) ||
      (await pathExists(path.join(candidate, "Passworder.exe")))
    ) {
      return candidate;
    }
  }

  throw new Error("errors.updatePackageInvalid");
}

async function findExtractedMacApp(extractDirectory) {
  const candidates = [];

  async function walk(directory, depth) {
    if (depth > 3) {
      return;
    }

    const entries = await fsPromises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      if (entry.name.endsWith(".app")) {
        candidates.push(fullPath);
        continue;
      }

      await walk(fullPath, depth + 1);
    }
  }

  await walk(extractDirectory, 0);

  const preferred =
    candidates.find((candidate) => path.basename(candidate) === "Passworder.app") ??
    candidates[0];

  if (!preferred) {
    throw new Error("errors.updatePackageInvalid");
  }

  return preferred;
}

function getMacAppBundlePath() {
  let current = path.resolve(process.execPath);

  while (current !== path.dirname(current)) {
    if (current.endsWith(".app")) {
      return current;
    }

    current = path.dirname(current);
  }

  throw new Error("errors.updateInstallUnavailable");
}

async function prepareDownloadedUpdatePackage(downloadPath) {
  const stagingRoot = path.join(getUpdateDownloadDirectory(), UPDATE_STAGING_DIR);
  const extractDirectory = path.join(stagingRoot, `passworder-${Date.now()}`);

  await fsPromises.rm(stagingRoot, { recursive: true, force: true });
  await fsPromises.mkdir(extractDirectory, { recursive: true });
  await expandUpdateArchive(downloadPath, extractDirectory);

  return findExtractedAppDirectory(extractDirectory);
}

function assertSafeUpdateTarget(targetDirectory, sourceDirectory) {
  const resolvedTarget = path.resolve(targetDirectory);
  const resolvedSource = path.resolve(sourceDirectory);
  const root = path.parse(resolvedTarget).root;

  if (
    resolvedTarget === root ||
    resolvedTarget.length < root.length + 4 ||
    resolvedTarget === resolvedSource ||
    resolvedTarget.startsWith(`${root}Volumes${path.sep}`)
  ) {
    throw new Error("errors.updateInstallUnavailable");
  }

  if (process.platform === "darwin" && !resolvedTarget.endsWith(".app")) {
    throw new Error("errors.updateInstallUnavailable");
  }
}

async function writeUpdateApplyScript() {
  const scriptPath = path.join(getUpdateDownloadDirectory(), UPDATE_APPLY_SCRIPT);
  const scriptContent = [
    "param(",
    "  [int]$ProcessId,",
    "  [string]$SourceDir,",
    "  [string]$TargetDir,",
    "  [string]$ExePath,",
    "  [string]$LogPath",
    ")",
    "$ErrorActionPreference = 'Stop'",
    "function Write-UpdateLog([string]$Message) {",
    "  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'",
    "  Add-Content -LiteralPath $LogPath -Value \"[$stamp] $Message\" -Encoding UTF8",
    "}",
    "try {",
    "  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null",
    "  Write-UpdateLog 'Waiting for Passworder to close.'",
    "  if ($ProcessId -gt 0) {",
    "    Wait-Process -Id $ProcessId -Timeout 45 -ErrorAction SilentlyContinue",
    "  }",
    "  $exeName = Split-Path -Leaf $ExePath",
    "  if (-not (Test-Path -LiteralPath (Join-Path $SourceDir $exeName)) -and -not (Test-Path -LiteralPath (Join-Path $SourceDir 'Passworder.exe'))) {",
    "    throw 'Update package executable missing.'",
    "  }",
    "  Write-UpdateLog 'Copying update files.'",
    "  & robocopy $SourceDir $TargetDir /E /R:10 /W:1 /NFL /NDL /NJH /NJS /NC /NS /NP",
    "  $code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }",
    "  if ($code -ge 8) {",
    "    throw \"robocopy failed with code $code\"",
    "  }",
    "  Write-UpdateLog 'Restarting Passworder.'",
    "  Start-Process -FilePath $ExePath",
    "  Write-UpdateLog 'Update applied.'",
    "} catch {",
    "  Write-UpdateLog (\"Update failed: \" + $_.Exception.Message)",
    "  if (Test-Path -LiteralPath $ExePath) {",
    "    Start-Process -FilePath $ExePath",
    "  }",
    "  exit 1",
    "}",
    "",
  ].join("\r\n");

  await fsPromises.writeFile(scriptPath, scriptContent, "utf8");
  return scriptPath;
}

async function writeMacUpdateApplyScript() {
  const scriptPath = path.join(getUpdateDownloadDirectory(), UPDATE_APPLY_SCRIPT_MAC);
  const scriptContent = [
    "#!/bin/bash",
    "set -euo pipefail",
    'PROCESS_ID="$1"',
    'SOURCE_APP="$2"',
    'TARGET_APP="$3"',
    'LOG_PATH="$4"',
    'log() {',
    '  mkdir -p "$(dirname "$LOG_PATH")"',
    '  echo "[$(date "+%Y-%m-%d %H:%M:%S")] $1" >> "$LOG_PATH"',
    "}",
    "log 'Waiting for Passworder to close.'",
    'if [ "${PROCESS_ID}" -gt 0 ]; then',
    "  while kill -0 \"$PROCESS_ID\" 2>/dev/null; do",
    "    sleep 0.4",
    "  done",
    "fi",
    "sleep 1",
    'if [ ! -d "$SOURCE_APP" ]; then',
    "  log 'Update package app missing.'",
    "  exit 1",
    "fi",
    "log 'Copying update files.'",
    '/usr/bin/ditto "$SOURCE_APP" "$TARGET_APP"',
    "log 'Restarting Passworder.'",
    '/usr/bin/open "$TARGET_APP"',
    "log 'Update applied.'",
    "",
  ].join("\n");

  await fsPromises.writeFile(scriptPath, scriptContent, "utf8");
  await fsPromises.chmod(scriptPath, 0o755);
  return scriptPath;
}

function launchDetachedMacUpdateScript(scriptPath, sourceApp) {
  return new Promise((resolve, reject) => {
    const targetApp = getMacAppBundlePath();
    const logPath = path.join(getUpdateDownloadDirectory(), "update.log");
    const child = spawn(
      "/bin/bash",
      [scriptPath, String(process.pid), sourceApp, targetApp, logPath],
      {
        detached: true,
        stdio: "ignore",
      },
    );

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function launchDetachedUpdateScript(scriptPath, sourceDirectory) {
  return new Promise((resolve, reject) => {
    const targetDirectory = path.dirname(process.execPath);
    const logPath = path.join(getUpdateDownloadDirectory(), "update.log");
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-ProcessId",
        String(process.pid),
        "-SourceDir",
        sourceDirectory,
        "-TargetDir",
        targetDirectory,
        "-ExePath",
        process.execPath,
        "-LogPath",
        logPath,
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
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

  if (!downloadName.toLocaleLowerCase("en-US").endsWith(".zip")) {
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: "errors.updateDownloadUnavailable",
    });
    throw new Error("errors.updateDownloadUnavailable");
  }

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
    await verifyDownloadedUpdatePackage(downloadPath, updateInfo);

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
    await fsPromises.rm(downloadPath, { force: true }).catch(() => {});
    const errorKey =
      error instanceof Error && error.message === "errors.updateVerificationFailed"
        ? "errors.updateVerificationFailed"
        : "errors.updateDownloadFailed";

    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error: errorKey,
    });
    throw error;
  }
}

async function installDownloadedUpdate() {
  if (updateDownloadState.status !== "ready" || !updateDownloadState.filePath) {
    throw new Error("errors.updateInstallerMissing");
  }

  if (!app.isPackaged || (process.platform !== "win32" && process.platform !== "darwin")) {
    throw new Error("errors.updateInstallUnavailable");
  }

  setUpdateDownloadState({
    status: "installing",
    progress: 100,
    error: undefined,
  });

  try {
    await fsPromises.access(updateDownloadState.filePath);
    const sourceDirectory = await prepareDownloadedUpdatePackage(
      updateDownloadState.filePath,
    );

    if (process.platform === "darwin") {
      const targetApp = getMacAppBundlePath();
      assertSafeUpdateTarget(targetApp, sourceDirectory);
      const scriptPath = await writeMacUpdateApplyScript();
      await launchDetachedMacUpdateScript(scriptPath, sourceDirectory);
    } else {
      const targetDirectory = path.dirname(process.execPath);
      assertSafeUpdateTarget(targetDirectory, sourceDirectory);
      const scriptPath = await writeUpdateApplyScript();
      await launchDetachedUpdateScript(scriptPath, sourceDirectory);
    }
  } catch (error) {
    setUpdateDownloadState({
      status: "error",
      progress: 0,
      error:
        error instanceof Error &&
        error.message.startsWith("errors.update")
          ? error.message
          : "errors.updateInstallerLaunchFailed",
    });
    throw error;
  }

  setTimeout(() => {
    isQuitting = true;
    app.quit();
  }, 300);

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

  applySavedWindowAnchor();
  applyContentProtection();

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
    applyContentProtection();
    if (!isHiddenLaunch) {
      showMainWindow();
    }
  });

  mainWindow.on("show", () => {
    applyContentProtection();
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

function getWindowPreferencesPath() {
  return app.getPath("userData");
}

function getSavedWindowAnchor() {
  return windowAnchor.loadWindowAnchor(getWindowPreferencesPath());
}

function applySavedWindowAnchor() {
  windowAnchor.applyWindowAnchor(mainWindow, getSavedWindowAnchor());
}

function setSavedWindowAnchor(anchor) {
  const nextAnchor = windowAnchor.saveWindowAnchor(getWindowPreferencesPath(), anchor);
  applySavedWindowAnchor();
  return nextAnchor;
}

function getSavedGeneratorOptions() {
  return windowAnchor.loadGeneratorOptions(getWindowPreferencesPath());
}

function setSavedGeneratorOptions(options) {
  return windowAnchor.saveGeneratorOptions(getWindowPreferencesPath(), options);
}

function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  applySavedWindowAnchor();
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

function applyContentProtection() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setContentProtection(true);
}

function createTray() {
  if (tray) {
    return;
  }

  const trayIconSize = process.platform === "darwin" ? 18 : 16;
  tray = new Tray(getAppIcon().resize({ width: trayIconSize, height: trayIconSize }));
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
let registeredShowShortcut = "";

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

  const showShortcut = getSavedShowShortcut();

  for (const assignment of vaultService.getShortcutAssignments()) {
    if (assignment.kind !== "keyboard" || assignment.accelerator === showShortcut) {
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

function isFunctionKey(key) {
  return /^F([1-9]|1[0-9]|2[0-4])$/.test(key);
}

function isSafeGlobalShortcut(shortcut) {
  const parts = String(shortcut ?? "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  const key = parts[parts.length - 1];
  const hasModifier = parts
    .slice(0, -1)
    .some(
      (part) =>
        part === "Command" ||
        part === "Control" ||
        part === "Alt" ||
        part === "Shift",
    );

  return hasModifier || isFunctionKey(key);
}

function normalizeShowShortcut(value) {
  const normalized = vaultService.normalizeShortcutInput(value);
  if (!normalized || vaultService.isMouseShortcut(normalized)) {
    return "";
  }

  return normalized;
}

function getSavedShowShortcut() {
  return normalizeShowShortcut(
    windowAnchor.loadShowShortcut(getWindowPreferencesPath()),
  );
}

function isShowShortcutUsedByEntry(shortcut) {
  return vaultService
    .getShortcutAssignments()
    .some((assignment) => assignment.accelerator === shortcut);
}

function usesShowShortcut(input) {
  const showShortcut = getSavedShowShortcut();
  if (!showShortcut) {
    return false;
  }

  const usernameShortcut = vaultService.normalizeShortcutInput(input?.usernameShortcut);
  const passwordShortcut = vaultService.normalizeShortcutInput(input?.passwordShortcut);
  return usernameShortcut === showShortcut || passwordShortcut === showShortcut;
}

function handleShowShortcut() {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    hideMainWindow();
    return;
  }

  showMainWindow();
}

function unregisterShowShortcut() {
  if (!registeredShowShortcut) {
    return;
  }

  globalShortcut.unregister(registeredShowShortcut);
  registeredShowShortcut = "";
}

function refreshShowShortcut() {
  unregisterShowShortcut();

  const shortcut = getSavedShowShortcut();
  if (!shortcut) {
    return true;
  }

  const registered = globalShortcut.register(shortcut, handleShowShortcut);
  if (!registered) {
    return false;
  }

  registeredShowShortcut = shortcut;
  return true;
}

function setSavedShowShortcut(shortcut) {
  const rawValue = typeof shortcut === "string" ? shortcut.trim() : "";

  if (!rawValue) {
    windowAnchor.saveShowShortcut(getWindowPreferencesPath(), "");
    refreshShowShortcut();
    return "";
  }

  const normalized = normalizeShowShortcut(rawValue);
  if (!normalized) {
    throw new Error("errors.shortcutInvalid");
  }

  if (!isSafeGlobalShortcut(normalized)) {
    throw new Error("errors.showShortcutNeedsModifier");
  }

  if (isShowShortcutUsedByEntry(normalized)) {
    throw new Error("errors.shortcutDuplicate");
  }

  const previousShortcut = registeredShowShortcut || getSavedShowShortcut();
  unregisterShowShortcut();

  const registered = globalShortcut.register(normalized, handleShowShortcut);
  if (!registered) {
    if (previousShortcut && previousShortcut !== normalized) {
      const restored = globalShortcut.register(previousShortcut, handleShowShortcut);
      if (restored) {
        registeredShowShortcut = previousShortcut;
      }
    }

    throw new Error("errors.showShortcutUnavailable");
  }

  registeredShowShortcut = normalized;
  windowAnchor.saveShowShortcut(getWindowPreferencesPath(), normalized);
  return normalized;
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
    if (usesShowShortcut(input)) {
      throw new Error("errors.shortcutDuplicate");
    }

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
  ipcMain.handle("vault:export-entries", async (_event, password) => {
    try {
      if (typeof password !== "string" || !password.trim()) {
        return { completed: false, error: "errors.exportPasswordRequired" };
      }

      const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
        defaultPath: getDefaultExportPath(),
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["createDirectory", "showOverwriteConfirmation"],
      });

      if (result.canceled || !result.filePath) {
        return { completed: false };
      }

      await vaultService.exportEntries(
        getVaultStoragePath(),
        result.filePath,
        password,
      );
      return { completed: true };
    } catch (error) {
      return { completed: false, error: toTransferErrorKey(error) };
    }
  });
  ipcMain.handle("vault:import-entries", async (_event, password) => {
    try {
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
        typeof password === "string" ? password : "",
      );

      refreshEntryShortcuts();

      return {
        completed: true,
        payload,
      };
    } catch (error) {
      return { completed: false, error: toTransferErrorKey(error) };
    }
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
  ipcMain.handle("window:get-anchor", async () => getSavedWindowAnchor());
  ipcMain.handle("window:set-anchor", async (_event, anchor) =>
    setSavedWindowAnchor(anchor),
  );
  ipcMain.handle("window:get-show-shortcut", async () => getSavedShowShortcut());
  ipcMain.handle("window:set-show-shortcut", async (_event, shortcut) =>
    setSavedShowShortcut(shortcut),
  );
  ipcMain.on("app:get-generator-options-sync", (event) => {
    event.returnValue = getSavedGeneratorOptions();
  });
  ipcMain.on("app:set-generator-options-sync", (event, options) => {
    event.returnValue = setSavedGeneratorOptions(options);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  enableAutoLaunch();
  registerIpcHandlers();
  createMainWindow();
  createTray();
  refreshShowShortcut();
  screen.on("display-metrics-changed", applySavedWindowAnchor);
  screen.on("display-added", applySavedWindowAnchor);
  screen.on("display-removed", applySavedWindowAnchor);

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
  unregisterShowShortcut();
});
