const { spawn } = require("node:child_process");

const electronBinary = require("electron");

const child = spawn(electronBinary, ["."], {
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_RENDERER_URL: "http://127.0.0.1:1420",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
