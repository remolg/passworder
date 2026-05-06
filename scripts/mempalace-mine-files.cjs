const { cpSync, existsSync, mkdirSync, rmSync, statSync } = require("node:fs");
const { dirname, isAbsolute, join, relative, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { spawnSync } = require("node:child_process");

const repoRoot = resolve(__dirname, "..");
const wing = process.env.MEMPALACE_WING || "passworder";
const mode = process.argv[2] || "commit";
const tempRoot = resolve(tmpdir());

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function runGit(args) {
  const result = run("git", args);

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    throw new Error(message || `git ${args.join(" ")} failed.`);
  }

  return result.stdout || "";
}

function splitNullList(output) {
  return output
    .split("\0")
    .map((file) => file.trim())
    .filter(Boolean);
}

function existingFiles(files) {
  const seen = new Set();

  return files.filter((file) => {
    const absolutePath = resolve(repoRoot, file);
    const relativePath = relative(repoRoot, absolutePath);

    if (relativePath.startsWith("..") || isAbsolute(relativePath) || seen.has(relativePath)) {
      return false;
    }

    if (!existsSync(absolutePath)) {
      return false;
    }

    const stats = statSync(absolutePath);
    if (!stats.isFile()) {
      return false;
    }

    seen.add(relativePath);
    return true;
  });
}

function filesForMode() {
  if (mode === "commit") {
    return splitNullList(
      runGit([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "--diff-filter=ACMR",
        "-r",
        "-z",
        "HEAD",
      ]),
    );
  }

  if (mode === "staged") {
    return splitNullList(runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]));
  }

  if (mode === "changed" || mode === "worktree") {
    return [
      ...splitNullList(runGit(["diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD"])),
      ...splitNullList(runGit(["ls-files", "-z", "--others", "--exclude-standard"])),
    ];
  }

  if (mode === "full") {
    return splitNullList(runGit(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]));
  }

  console.log(`Unknown Mempalace mode: ${mode}`);
  return [];
}

function hasMempalaceCli() {
  const result = run("mempalace", ["--version"]);

  if (result.error && result.error.code === "ENOENT") {
    return false;
  }

  return result.status === 0;
}

function safeRemoveTemp(path) {
  const absolutePath = resolve(path);

  if (absolutePath === tempRoot || !absolutePath.startsWith(`${tempRoot}\\`)) {
    throw new Error(`Unsafe temporary directory removal request: ${absolutePath}`);
  }

  rmSync(absolutePath, { recursive: true, force: true });
}

function copyProjectConfig(stagingDir) {
  for (const file of ["mempalace.yaml", "entities.json"]) {
    const source = resolve(repoRoot, file);

    if (existsSync(source)) {
      cpSync(source, join(stagingDir, file), { errorOnExist: false });
    }
  }
}

function hiddenProjectFiles(files) {
  return files.filter((file) => file.split(/[\\/]/).some((part) => part.startsWith(".")));
}

function mineFiles(files) {
  const stagingDir = join(tempRoot, `mempalace-${process.pid}-${Date.now()}`);

  try {
    safeRemoveTemp(stagingDir);
    mkdirSync(stagingDir, { recursive: true });
    copyProjectConfig(stagingDir);

    for (const file of files) {
      const target = join(stagingDir, file);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(resolve(repoRoot, file), target, { errorOnExist: false });
    }

    console.log(`Mempalace will process ${files.length} file(s). Mode: ${mode}`);

    const hiddenFiles = hiddenProjectFiles(files);
    const args = ["mine", stagingDir, "--wing", wing];

    if (hiddenFiles.length > 0) {
      args.push("--include-ignored", hiddenFiles.join(","));
    }

    const mine = run("mempalace", args, {
      stdio: "inherit",
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    if (mine.status !== 0) {
      console.log("Mempalace save failed; git operation will continue.");
    }
  } finally {
    safeRemoveTemp(stagingDir);
  }
}

try {
  if (!hasMempalaceCli()) {
    console.log("Mempalace CLI was not found; memory save skipped.");
    process.exit(0);
  }

  const files = existingFiles(filesForMode());

  if (files.length === 0) {
    console.log(`No files to process for Mempalace. Mode: ${mode}`);
    process.exit(0);
  }

  mineFiles(files);
} catch (error) {
  console.log(`Mempalace save skipped: ${error.message}`);
}
