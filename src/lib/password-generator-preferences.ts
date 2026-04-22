import { PasswordGeneratorOptions } from "@/types/vault";

export const DEFAULT_GENERATOR_LENGTH = 14;
export const MIN_GENERATOR_LENGTH = 8;
export const MAX_GENERATOR_LENGTH = 48;

const GENERATOR_LENGTH_STORAGE_KEY = "passworder.generator.length";

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

export function getDefaultGeneratorOptions(): PasswordGeneratorOptions {
  return {
    length: getStoredGeneratorLength(),
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  };
}

function clampGeneratorLength(length: number) {
  return Math.min(
    MAX_GENERATOR_LENGTH,
    Math.max(MIN_GENERATOR_LENGTH, Math.round(length)),
  );
}
