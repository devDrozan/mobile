import { createContext, useContext, useRef, useState, type PropsWithChildren } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Calculation, Context, ContextInput } from './api/client';
import type { FieldErrors, WageRow, YearRow } from './calculator-draft';
import { employmentSchema, type EmploymentValues } from './validation';

export const blankEmployment: EmploymentValues = { startDate: '', lastWorkingDate: '', weeklyHours: 40, hasSpecialCircumstances: false };

function useSessionState() {
  const form = useForm<EmploymentValues>({ resolver: zodResolver(employmentSchema), defaultValues: blankEmployment });
  const [weeklyHoursText, setWeeklyHoursText] = useState('40');
  const [method, setMethod] = useState<ContextInput['method']>('normal');
  const [step, setStep] = useState(0);
  const [context, setContext] = useState<Context>();
  const [result, setResult] = useState<Calculation>();
  const [wages, setWages] = useState<WageRow[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [bonus, setBonus] = useState('0');
  const [leave, setLeave] = useState('0');
  const [ordinary, setOrdinary] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceDate, setBalanceDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [periodsChanged, setPeriodsChanged] = useState(false);
  const draftContextRef = useRef<Context>(undefined);

  function resetEmployment(values: EmploymentValues) {
    form.reset(values);
    setWeeklyHoursText(String(values.weeklyHours));
  }

  return {
    form, weeklyHoursText, setWeeklyHoursText, resetEmployment,
    method, setMethod, step, setStep, context, setContext, result, setResult,
    wages, setWages, years, setYears, bonus, setBonus, leave, setLeave,
    ordinary, setOrdinary, balance, setBalance, balanceDate, setBalanceDate,
    busy, setBusy, error, setError, fieldErrors, setFieldErrors,
    periodsChanged, setPeriodsChanged, draftContextRef,
  };
}

const CalculatorSession = createContext<ReturnType<typeof useSessionState> | null>(null);

// Root-layout lifetime preserves drafts across routes without writing financial data to storage.
export function CalculatorSessionProvider({ children }: PropsWithChildren) {
  return <CalculatorSession.Provider value={useSessionState()}>{children}</CalculatorSession.Provider>;
}

export function useCalculatorSession() {
  const session = useContext(CalculatorSession);
  if (!session) throw new Error('CalculatorSessionProvider is required');
  return session;
}
