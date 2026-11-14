import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { newForm, type ExpenseForm } from './model';
function createSession() {
  let month: string | undefined;
  let selectedDate: string | undefined;
  const selectedDates = new Map<string, string>();
  const forms = new Map<string, ExpenseForm>();
  let pending: Promise<void> | undefined;
  return {
    forms,
    getSelectedDate: () => {
      // Preserve an unsaved month-keyed form from a hot update in this session.
      const legacy = month ? forms.get(month) : undefined;
      if (!selectedDate && legacy) { selectedDate = legacy.entry.date; month = selectedDate.slice(0, 7); selectedDates.set(month, selectedDate); }
      return selectedDate;
    },
    selectedForMonth: (key: string) => selectedDates.get(key),
    setSelectedDate: (date: string | undefined) => { selectedDate = date; if (date) { month = date.slice(0, 7); selectedDates.set(month, date); } },
    formForDate: (date: string) => {
      if (!forms.has(date)) {
        const key = date.slice(0, 7); const legacy = forms.get(key);
        if (legacy?.entry.date === date) { forms.set(date, legacy); forms.delete(key); }
        else forms.set(date, newForm(date));
      }
      return forms.get(date)!;
    },
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
export function ExpenseSessionProvider({ children }: PropsWithChildren) { const [session] = useState(createSession); return <Context.Provider value={session}>{children}</Context.Provider>; }
export function useExpenseSession() { const [local] = useState(createSession); return useContext(Context) ?? local; }
