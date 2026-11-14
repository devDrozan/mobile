import type { ExpenseEntry } from './model';
// Native builds resolve storage.native.ts. The independent web/PWA owns its
// IndexedDB adapter; Expo web never imports native SQLite/WASM.
const unsupported = async (): Promise<never> => { throw new Error('NATIVE_STORAGE_REQUIRED'); };
export const loadMonth: (month: string) => Promise<{ entries: ExpenseEntry[]; consented: boolean }> = unsupported;
export const saveEntry: (entry: ExpenseEntry, editing: boolean) => Promise<ExpenseEntry> = unsupported;
export const deleteEntry: (id: string) => Promise<void> = unsupported;
export const deleteMonth: (month: string) => Promise<void> = unsupported;
export const deleteAll: () => Promise<void> = unsupported;

export const readDisclosureAcceptance = async (): Promise<boolean> => false;
