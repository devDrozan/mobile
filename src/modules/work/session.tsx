import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { SalaryInput } from './model';
function createSession() {
  let month: string | undefined;
  let pending: Promise<void> | undefined;
  return {
    drafts: new Map<string, SalaryInput>(),
    collapsedSettings: new Set<string>(),
    getMonth: () => month,
    setMonth: (next: string) => { month = next; },
    waitForPending: () => pending,
    mutation<T>(action: () => Promise<T>): Promise<T> {
      const operation = action();
      const completed = operation.then(() => {}, () => {});
      pending = completed;
      void completed.then(() => { if (pending === completed) pending = undefined; });
      return operation;
    },
  };
}
const Context = createContext<ReturnType<typeof createSession> | null>(null);
export function SalaryDraftSessionProvider({ children }: PropsWithChildren) { const [session] = useState(createSession); return <Context.Provider value={session}>{children}</Context.Provider>; }
export function useSalaryDraftSession() { const [local] = useState(createSession); return useContext(Context) ?? local; }
