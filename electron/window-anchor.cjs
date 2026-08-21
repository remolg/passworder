const fs = require("node:fs");
const path = require("node:path");
const { screen } = require("electron");

const WINDOW_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const DEFAULT_WINDOW_ANCHOR = "bottom-right";
const WINDOW_MARGIN = 16;
const MIN_GENERATOR_LENGTH = 8;
const MAX_GENERATOR_LENGTH = 48;
const DEFAULT_GENERATOR_OPTIONS = {
  length: 14,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

function isWindowAnchor(value) {
  return WINDOW_ANCHORS.includes(value);
}

function getPreferencesPath(userDataPath) {
  return path.join(userDataPath, "window-preferences.json");
}

function clampGeneratorLength(length) {
  const parsed = Number(length);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_GENERATOR_OPTIONS.length;
  }

  return Math.min(MAX_GENERATOR_LENGTH, Math.max(MIN_GENERATOR_LENGTH, Math.round(parsed)));
}

function normalizeGeneratorOptions(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_GENERATOR_OPTIONS };
  }

  const nextOptions = {
    length: clampGeneratorLength(value.length),
    uppercase: typeof value.uppercase === "boolean" ? value.uppercase : true,
    lowercase: typeof value.lowercase === "boolean" ? value.lowercase : true,
    numbers: typeof value.numbers === "boolean" ? value.numbers : true,
    symbols: typeof value.symbols === "boolean" ? value.symbols : true,
  };

  if (
    !nextOptions.uppercase &&
    !nextOptions.lowercase &&
    !nextOptions.numbers &&
    !nextOptions.symbols
  ) {
    nextOptions.lowercase = true;
  }

  return nextOptions;
}

function loadPreferences(userDataPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(getPreferencesPath(userDataPath), "utf8"));
    return {
      windowAnchor: isWindowAnchor(parsed?.windowAnchor)
        ? parsed.windowAnchor
        : DEFAULT_WINDOW_ANCHOR,
      showShortcut:
        typeof parsed?.showShortcut === "string" ? parsed.showShortcut : "",
      generatorOptions: parsed?.generatorOptions
        ? normalizeGeneratorOptions(parsed.generatorOptions)
        : null,
    };
  } catch {
    return {
      windowAnchor: DEFAULT_WINDOW_ANCHOR,
      showShortcut: "",
      generatorOptions: null,
    };
  }
}

function savePreferences(userDataPath, patch) {
  const current = loadPreferences(userDataPath);
  const nextPreferences = {
    windowAnchor: current.windowAnchor,
    showShortcut: current.showShortcut,
    ...patch,
  };

  if (!nextPreferences.generatorOptions && current.generatorOptions) {
    nextPreferences.generatorOptions = current.generatorOptions;
  }

  if (!nextPreferences.generatorOptions) {
    delete nextPreferences.generatorOptions;
  }

  fs.writeFileSync(
    getPreferencesPath(userDataPath),
    `${JSON.stringify(nextPreferences, null, 2)}\n`,
    "utf8",
  );

  return {
    ...nextPreferences,
    generatorOptions: nextPreferences.generatorOptions ?? null,
  };
}

function loadWindowAnchor(userDataPath) {
  return loadPreferences(userDataPath).windowAnchor;
}

function saveWindowAnchor(userDataPath, anchor) {
  const nextAnchor = isWindowAnchor(anchor) ? anchor : DEFAULT_WINDOW_ANCHOR;
  return savePreferences(userDataPath, { windowAnchor: nextAnchor }).windowAnchor;
}

function loadShowShortcut(userDataPath) {
  return loadPreferences(userDataPath).showShortcut;
}

function saveShowShortcut(userDataPath, shortcut) {
  const nextShortcut = typeof shortcut === "string" ? shortcut : "";
  return savePreferences(userDataPath, { showShortcut: nextShortcut }).showShortcut;
}

function loadGeneratorOptions(userDataPath) {
  return loadPreferences(userDataPath).generatorOptions;
}

function saveGeneratorOptions(userDataPath, options) {
  const nextOptions = normalizeGeneratorOptions(options);
  return savePreferences(userDataPath, { generatorOptions: nextOptions })
    .generatorOptions;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAnchoredBounds(anchor, size) {
  const { workArea } = screen.getPrimaryDisplay();
  const width = size?.width ?? 360;
  const height = size?.height ?? 650;
  const safeAnchor = isWindowAnchor(anchor) ? anchor : DEFAULT_WINDOW_ANCHOR;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);
  const x = safeAnchor.endsWith("right")
    ? workArea.x + workArea.width - width - WINDOW_MARGIN
    : workArea.x + WINDOW_MARGIN;
  const y = safeAnchor.startsWith("bottom")
    ? workArea.y + workArea.height - height - WINDOW_MARGIN
    : workArea.y + WINDOW_MARGIN;

  return {
    x: Math.round(clamp(x, workArea.x, maxX)),
    y: Math.round(clamp(y, workArea.y, maxY)),
    width,
    height,
  };
}

function applyWindowAnchor(win, anchor) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const currentBounds = win.getBounds();
  win.setBounds(getAnchoredBounds(anchor, currentBounds));
}

module.exports = {
  DEFAULT_WINDOW_ANCHOR,
  WINDOW_ANCHORS,
  applyWindowAnchor,
  isWindowAnchor,
  loadGeneratorOptions,
  loadShowShortcut,
  loadWindowAnchor,
  saveGeneratorOptions,
  saveShowShortcut,
  saveWindowAnchor,
};
