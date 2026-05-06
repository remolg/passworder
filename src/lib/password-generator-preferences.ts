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

export function getStoredGeneratorOptions(): PasswordGeneratorOptions {
  if (typeof window === "undefined") {
    return DEFAULT_GENERATOR_OPTIONS;
  }

  try {
    const rawValue = window.localStorage.getItem(GENERATOR_OPTIONS_STORAGE_KEY);
    if (!rawValue) {
      return {
        ...DEFAULT_GENERATOR_OPTIONS,
        length: getStoredGeneratorLength(),
      };
    }

    return normalizeGeneratorOptions(JSON.parse(rawValue));
  } catch {
    return {
      ...DEFAULT_GENERATOR_OPTIONS,
      length: getStoredGeneratorLength(),
    };
  }
}

export function persistGeneratorLength(length: number) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      GENERATOR_LENGTH_STORAGE_KEY,
      String(clampGeneratorLength(length)),
    );
  } catch {}
}

export function persistGeneratorOptions(options: PasswordGeneratorOptions) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedOptions = normalizeGeneratorOptions(options);

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

function normalizeGeneratorOptions(value: unknown): PasswordGeneratorOptions {
  if (!value || typeof value !== "object") {
    return DEFAULT_GENERATOR_OPTIONS;
  }

  const input = value as Partial<PasswordGeneratorOptions>;
  const nextOptions = {
    length:
      typeof input.length === "number"
        ? clampGeneratorLength(input.length)
        : getStoredGeneratorLength(),
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
