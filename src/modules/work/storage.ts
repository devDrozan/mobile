// The Expo web preview does not load native SQLite/WASM. The independently
// delivered web/PWA owns IndexedDB; native builds resolve storage.native.ts.
import type { SalaryInput } from './model';
const unsupported = async (): Promise<never> => { throw new Error('NATIVE_STORAGE_REQUIRED'); };
export const loadMonth: (month: string) => Promise<{draft: SalaryInput; consented: boolean}> = unsupported;
export const saveMonth: (draft: SalaryInput) => Promise<void> = unsupported;
export const deleteMonth: (month: string) => Promise<void> = unsupported;
export const deleteAll: () => Promise<void> = unsupported;
