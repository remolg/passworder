export type AppLanguage = "en" | "tr";

export interface VaultSettings {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  language: AppLanguage;
}

export interface VaultEntry {
  id: string;
  service: string;
  logoId?: string;
  folderId?: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultPayload {
  entries: VaultEntry[];
  folders: VaultFolder[];
  settings: VaultSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ExportEntriesResult {
  completed: boolean;
}

export interface ImportEntriesResult {
  completed: boolean;
  payload?: VaultPayload;
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
  logoId: string;
  folderId: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string;
}

export interface EntryMutationInput {
  id?: string;
  service: string;
  logoId?: string;
  folderId?: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
}

export interface FolderMutationInput {
  name: string;
}

export interface MasterPasswordChangeInput {
  currentPassword: string;
  nextPassword: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}
