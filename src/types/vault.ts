export interface VaultSettings {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
}

export interface VaultEntry {
  id: string;
  service: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultPayload {
  entries: VaultEntry[];
  settings: VaultSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AppStatus {
  vaultExists: boolean;
  isUnlocked: boolean;
  defaultAutoLockMinutes: number;
  storagePath?: string;
}

export interface EntryFormValues {
  id?: string;
  service: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string;
}

export interface EntryMutationInput {
  id?: string;
  service: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}
