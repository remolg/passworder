const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const projectDir = path.join(__dirname, "..");
const releaseDir = path.join(projectDir, "release");
const unpackedDir = path.join(releaseDir, "win-unpacked");
const { version } = require(path.join(projectDir, "package.json"));

const zipName = `Passworder-Portable-${version}-win-x64.zip`;
const zipPath = path.join(releaseDir, zipName);
const checksumPath = `${zipPath}.sha256`;

if (!fs.existsSync(unpackedDir)) {
  throw new Error(`Missing unpacked app directory: ${unpackedDir}`);
}

fs.rmSync(zipPath, { force: true });
fs.rmSync(checksumPath, { force: true });

const archiveCommand =
  "& { param($SourcePath, $DestinationPath) Compress-Archive -Path $SourcePath -DestinationPath $DestinationPath -Force }";
const archiveResult = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    archiveCommand,
    path.join(unpackedDir, "*"),
    zipPath,
  ],
  {
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
  },
);

if (archiveResult.status !== 0) {
  throw new Error(
    `Portable archive failed: ${archiveResult.stderr || archiveResult.stdout}`,
  );
}

const hash = crypto.createHash("sha256");
const file = fs.readFileSync(zipPath);
hash.update(file);

fs.writeFileSync(checksumPath, `${hash.digest("hex")}  ${zipName}\n`, "utf8");
