import { PasswordGeneratorOptions } from "@/types/vault";

export const DEFAULT_GENERATOR_LENGTH = 14;
export const MIN_GENERATOR_LENGTH = 8;
export const MAX_GENERATOR_LENGTH = 48;

const GENERATOR_LENGTH_STORAGE_KEY = "passworder.generator.length";
const GENERATOR_OPTIONS_STORAGE_KEY = "passworder.generator.options";

const DEFAULT_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  length: DEFAULT_GENERATOR_LENGTH,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export function getStoredGeneratorLength() {
  return getStoredGeneratorOptions().length;
}

export function getStoredGeneratorOptions(): PasswordGeneratorOptions {
  const desktopOptions = readDesktopGeneratorOptions();
  if (desktopOptions) {
    return desktopOptions;
  }

  if (typeof window === "undefined") {
    return { ...DEFAULT_GENERATOR_OPTIONS };
  }

  try {
    const rawValue = window.localStorage.getItem(GENERATOR_OPTIONS_STORAGE_KEY);
    const nextOptions = rawValue
      ? normalizeGeneratorOptions(JSON.parse(rawValue))
      : {
          ...DEFAULT_GENERATOR_OPTIONS,
          length: readStoredLength(),
        };

    writeDesktopGeneratorOptions(nextOptions);
    return nextOptions;
  } catch {
    return {
      ...DEFAULT_GENERATOR_OPTIONS,
      length: readStoredLength(),
    };
  }
}

export function persistGeneratorLength(length: number) {
  persistGeneratorOptions({
    ...getStoredGeneratorOptions(),
    length,
  });
}

export function persistGeneratorOptions(options: PasswordGeneratorOptions) {
  const normalizedOptions = normalizeGeneratorOptions(options);
  writeDesktopGeneratorOptions(normalizedOptions);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      GENERATOR_OPTIONS_STORAGE_KEY,
      JSON.stringify(normalizedOptions),
    );
    window.localStorage.setItem(
      GENERATOR_LENGTH_STORAGE_KEY,
      String(normalizedOptions.length),
    );
  } catch {}
}

export function getDefaultGeneratorOptions(): PasswordGeneratorOptions {
  return getStoredGeneratorOptions();
}

function readDesktopGeneratorOptions() {
  try {
    const options = window.passworder?.getGeneratorOptions?.();
    if (!options || typeof options !== "object") {
      return null;
    }

    return normalizeGeneratorOptions(options);
  } catch {
    return null;
  }
}

function writeDesktopGeneratorOptions(options: PasswordGeneratorOptions) {
  try {
    window.passworder?.setGeneratorOptions?.(options);
  } catch {}
}

function readStoredLength() {
  if (typeof window === "undefined") {
    return DEFAULT_GENERATOR_LENGTH;
  }

  try {
    const rawValue = window.localStorage.getItem(GENERATOR_LENGTH_STORAGE_KEY);
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return DEFAULT_GENERATOR_LENGTH;
    }

    return clampGeneratorLength(parsedValue);
  } catch {
    return DEFAULT_GENERATOR_LENGTH;
  }
}

function normalizeGeneratorOptions(value: unknown): PasswordGeneratorOptions {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_GENERATOR_OPTIONS };
  }

  const input = value as Partial<PasswordGeneratorOptions>;
  const nextOptions = {
    length:
      typeof input.length === "number"
        ? clampGeneratorLength(input.length)
        : DEFAULT_GENERATOR_LENGTH,
    uppercase: typeof input.uppercase === "boolean" ? input.uppercase : true,
    lowercase: typeof input.lowercase === "boolean" ? input.lowercase : true,
    numbers: typeof input.numbers === "boolean" ? input.numbers : true,
    symbols: typeof input.symbols === "boolean" ? input.symbols : true,
  };

  if (
    !nextOptions.uppercase &&
    !nextOptions.lowercase &&
    !nextOptions.numbers &&
    !nextOptions.symbols
  ) {
    return {
      ...nextOptions,
      lowercase: true,
    };
  }

  return nextOptions;
}

function clampGeneratorLength(length: number) {
  return Math.min(
    MAX_GENERATOR_LENGTH,
    Math.max(MIN_GENERATOR_LENGTH, Math.round(length)),
  );
}
