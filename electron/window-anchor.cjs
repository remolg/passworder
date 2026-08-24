const fs = require("node:fs");
const path = require("node:path");
const { screen } = require("electron");

const WINDOW_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];
const DEFAULT_WINDOW_ANCHOR = "bottom-right";
const ANCHOR_UNITS = {
  "top-left": { x: 0, y: 0 },
  "top-center": { x: 0.5, y: 0 },
  "top-right": { x: 1, y: 0 },
  "center-left": { x: 0, y: 0.5 },
  "center": { x: 0.5, y: 0.5 },
  "center-right": { x: 1, y: 0.5 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-center": { x: 0.5, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};
const WINDOW_MARGIN = 16;
const SNAP_TOLERANCE = 16;
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

function clampUnit(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

function nearestUnit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  if (parsed < 0.25) {
    return 0;
  }

  if (parsed > 0.75) {
    return 1;
  }

  return 0.5;
}

function unitsToAnchor(x, y) {
  const xKey = nearestUnit(x) === 0 ? "left" : nearestUnit(x) === 1 ? "right" : "center";
  const yKey = nearestUnit(y) === 0 ? "top" : nearestUnit(y) === 1 ? "bottom" : "center";

  if (xKey === "center" && yKey === "center") {
    return "center";
  }

  if (yKey === "center") {
    return `center-${xKey}`;
  }

  if (xKey === "center") {
    return `${yKey}-center`;
  }

  return `${yKey}-${xKey}`;
}

function resolveWindowAnchor(value, placement) {
  if (isWindowAnchor(value)) {
    return value;
  }

  if (placement && typeof placement === "object") {
    const nextAnchor = unitsToAnchor(placement.x, placement.y);
    if (isWindowAnchor(nextAnchor)) {
      return nextAnchor;
    }
  }

  return DEFAULT_WINDOW_ANCHOR;
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
      windowAnchor:
        parsed?.windowAnchor === null
          ? null
          : resolveWindowAnchor(parsed?.windowAnchor, parsed?.windowPlacement),
      windowCustomX:
        typeof parsed?.windowCustomX === "number"
          ? clampUnit(parsed.windowCustomX)
          : null,
      windowCustomY:
        typeof parsed?.windowCustomY === "number"
          ? clampUnit(parsed.windowCustomY)
          : null,
      windowLocked:
        typeof parsed?.windowLocked === "boolean" ? parsed.windowLocked : false,
      showShortcut:
        typeof parsed?.showShortcut === "string" ? parsed.showShortcut : "",
      developerMode:
        typeof parsed?.developerMode === "boolean" ? parsed.developerMode : null,
      generatorOptions: parsed?.generatorOptions
        ? normalizeGeneratorOptions(parsed.generatorOptions)
        : null,
    };
  } catch {
    return {
      windowAnchor: DEFAULT_WINDOW_ANCHOR,
      windowCustomX: null,
      windowCustomY: null,
      windowLocked: false,
      showShortcut: "",
      developerMode: null,
      generatorOptions: null,
    };
  }
}

function savePreferences(userDataPath, patch) {
  const current = loadPreferences(userDataPath);
  const nextPreferences = {
    windowAnchor: current.windowAnchor,
    windowCustomX: current.windowCustomX,
    windowCustomY: current.windowCustomY,
    windowLocked: current.windowLocked,
    showShortcut: current.showShortcut,
    ...patch,
  };

  if (nextPreferences.windowAnchor !== null) {
    nextPreferences.windowAnchor = isWindowAnchor(nextPreferences.windowAnchor)
      ? nextPreferences.windowAnchor
      : DEFAULT_WINDOW_ANCHOR;
  }

  if (typeof nextPreferences.windowCustomX === "number") {
    nextPreferences.windowCustomX = clampUnit(nextPreferences.windowCustomX);
  } else {
    delete nextPreferences.windowCustomX;
  }

  if (typeof nextPreferences.windowCustomY === "number") {
    nextPreferences.windowCustomY = clampUnit(nextPreferences.windowCustomY);
  } else {
    delete nextPreferences.windowCustomY;
  }

  nextPreferences.windowLocked = Boolean(nextPreferences.windowLocked);
  delete nextPreferences.windowPlacement;

  if (typeof nextPreferences.developerMode !== "boolean") {
    if (typeof current.developerMode === "boolean") {
      nextPreferences.developerMode = current.developerMode;
    } else {
      delete nextPreferences.developerMode;
    }
  }

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

function loadWindowPosition(userDataPath) {
  const preferences = loadPreferences(userDataPath);
  return {
    windowAnchor: preferences.windowAnchor,
    windowCustomX: preferences.windowCustomX,
    windowCustomY: preferences.windowCustomY,
  };
}

function saveWindowPosition(userDataPath, position) {
  const nextPosition = savePreferences(userDataPath, {
    windowAnchor: position?.windowAnchor === null ? null : position?.windowAnchor,
    windowCustomX:
      typeof position?.windowCustomX === "number" ? position.windowCustomX : null,
    windowCustomY:
      typeof position?.windowCustomY === "number" ? position.windowCustomY : null,
  });

  return {
    windowAnchor: nextPosition.windowAnchor,
    windowCustomX: nextPosition.windowCustomX ?? null,
    windowCustomY: nextPosition.windowCustomY ?? null,
  };
}

function loadWindowLocked(userDataPath) {
  return Boolean(loadPreferences(userDataPath).windowLocked);
}

function saveWindowLocked(userDataPath, locked) {
  return savePreferences(userDataPath, { windowLocked: Boolean(locked) })
    .windowLocked;
}

function loadShowShortcut(userDataPath) {
  return loadPreferences(userDataPath).showShortcut;
}

function saveShowShortcut(userDataPath, shortcut) {
  const nextShortcut = typeof shortcut === "string" ? shortcut : "";
  return savePreferences(userDataPath, { showShortcut: nextShortcut }).showShortcut;
}

function loadDeveloperMode(userDataPath) {
  return loadPreferences(userDataPath).developerMode;
}

function saveDeveloperMode(userDataPath, enabled) {
  return savePreferences(userDataPath, { developerMode: Boolean(enabled) })
    .developerMode;
}

function loadGeneratorOptions(userDataPath) {
  return loadPreferences(userDataPath).generatorOptions;
}

function saveGeneratorOptions(userDataPath, options) {
  const nextOptions = normalizeGeneratorOptions(options);
  return savePreferences(userDataPath, { generatorOptions: nextOptions })
    .generatorOptions;
}

function getTargetWorkArea(win) {
  if (win && !win.isDestroyed()) {
    return screen.getDisplayMatching(win.getBounds()).workArea;
  }

  return screen.getPrimaryDisplay().workArea;
}

function getPlacementRange(workArea, size) {
  const width = size?.width ?? 360;
  const height = size?.height ?? 650;
  const minX = workArea.x + WINDOW_MARGIN;
  const minY = workArea.y + WINDOW_MARGIN;
  const maxX = workArea.x + workArea.width - width - WINDOW_MARGIN;
  const maxY = workArea.y + workArea.height - height - WINDOW_MARGIN;

  return {
    width,
    height,
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
  };
}

function getAnchoredBounds(anchor, size, workArea) {
  const area = workArea ?? screen.getPrimaryDisplay().workArea;
  const range = getPlacementRange(area, size);
  const units = ANCHOR_UNITS[isWindowAnchor(anchor) ? anchor : DEFAULT_WINDOW_ANCHOR];

  return {
    x: Math.round(range.minX + units.x * (range.maxX - range.minX)),
    y: Math.round(range.minY + units.y * (range.maxY - range.minY)),
    width: range.width,
    height: range.height,
  };
}

function matchAnchorFromBounds(bounds, workArea) {
  for (const anchor of WINDOW_ANCHORS) {
    const snap = getAnchoredBounds(anchor, bounds, workArea);
    if (
      Math.abs(snap.x - bounds.x) <= SNAP_TOLERANCE &&
      Math.abs(snap.y - bounds.y) <= SNAP_TOLERANCE
    ) {
      return anchor;
    }
  }

  return null;
}

function boundsToCustomPlacement(bounds, workArea) {
  const range = getPlacementRange(workArea, bounds);
  const xRange = range.maxX - range.minX;
  const yRange = range.maxY - range.minY;

  return {
    x: xRange === 0 ? 0 : clampUnit((bounds.x - range.minX) / xRange),
    y: yRange === 0 ? 0 : clampUnit((bounds.y - range.minY) / yRange),
  };
}

function applyWindowAnchor(win, anchor) {
  applyWindowPosition(win, { windowAnchor: anchor });
}

function applyWindowPosition(win, position) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const currentBounds = win.getBounds();
  const workArea = getTargetWorkArea(win);

  if (isWindowAnchor(position?.windowAnchor)) {
    win.setBounds(getAnchoredBounds(position.windowAnchor, currentBounds, workArea));
    return;
  }

  if (
    typeof position?.windowCustomX === "number" &&
    typeof position?.windowCustomY === "number"
  ) {
    const range = getPlacementRange(workArea, currentBounds);
    win.setBounds({
      x: Math.round(
        range.minX + clampUnit(position.windowCustomX) * (range.maxX - range.minX),
      ),
      y: Math.round(
        range.minY + clampUnit(position.windowCustomY) * (range.maxY - range.minY),
      ),
      width: currentBounds.width,
      height: currentBounds.height,
    });
    return;
  }

  win.setBounds(getAnchoredBounds(DEFAULT_WINDOW_ANCHOR, currentBounds, workArea));
}

module.exports = {
  DEFAULT_WINDOW_ANCHOR,
  WINDOW_ANCHORS,
  applyWindowAnchor,
  applyWindowPosition,
  boundsToCustomPlacement,
  getAnchoredBounds,
  getTargetWorkArea,
  isWindowAnchor,
  loadDeveloperMode,
  loadGeneratorOptions,
  loadShowShortcut,
  loadWindowAnchor,
  loadWindowLocked,
  loadWindowPosition,
  matchAnchorFromBounds,
  saveDeveloperMode,
  saveGeneratorOptions,
  saveShowShortcut,
  saveWindowAnchor,
  saveWindowLocked,
  saveWindowPosition,
};
