import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { decodeStoredMonth, emptyMonth, normalizeSalaryInput, validateMonth, type SalaryInput } from './model';
import { decodeStoredLeave, validateLeave, type LeaveRecord } from './leave';
let database: Promise<SQLiteDatabase> | undefined;
async function db() {
  if (!database) database = (async () => {
    const connection = await openDatabaseAsync('e9-work-time.db');
    try {
      await connection.execAsync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
      const version = await connection.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((version?.user_version ?? 0) > 1) throw new Error('UNSUPPORTED_STORAGE_VERSION');
      if (!version?.user_version) await connection.withExclusiveTransactionAsync(async transaction => {
        await transaction.execAsync('CREATE TABLE IF NOT EXISTS work_months (month TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS work_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;');
      });
      return connection;
    } catch (error) { await connection.closeAsync(); throw error; }
  })().catch(error => { database = undefined; throw error; });
  return database;
}
export async function loadMonth(month: string): Promise<{ draft: SalaryInput; consented: boolean }> {
  const connection = await db();
  const row = await connection.getFirstAsync<{ payload: string }>('SELECT payload FROM work_months WHERE month = ?', month);
  const previous = row ? null : await connection.getFirstAsync<{ month: string; payload: string }>('SELECT month, payload FROM work_months WHERE month < ? ORDER BY month DESC LIMIT 1', month);
  const parsed: SalaryInput | undefined = row || previous ? decodeStoredMonth((row ?? previous)!.payload, row ? month : previous!.month) : undefined;
  if (parsed && Object.keys(validateMonth(parsed)).length) throw new Error('INVALID_STORED_DATA');
  const consent = await connection.getFirstAsync<{ value: string }>('SELECT value FROM work_preferences WHERE key = ?', 'disclosure-v1');
  return { draft: row && parsed ? parsed : emptyMonth(month, parsed?.settings), consented: consent?.value === 'accepted' };
}
export async function saveMonth(draft: SalaryInput, leave?: LeaveRecord): Promise<void> {
  const normalized = normalizeSalaryInput(draft);
  if (Object.keys(validateMonth(normalized)).length) throw new Error('INVALID_INPUT');
  if (leave && validateLeave(leave)) throw new Error('INVALID_INPUT');
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => {
    await transaction.runAsync('INSERT INTO work_months(month, payload) VALUES (?, ?) ON CONFLICT(month) DO UPDATE SET payload = excluded.payload', normalized.month, JSON.stringify(normalized));
    await transaction.runAsync('INSERT INTO work_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'disclosure-v1', 'accepted');
    if (leave) await transaction.runAsync('INSERT INTO work_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', `leave-${leave.year}`, JSON.stringify(leave));
  });
}
export async function loadLeave(year: number): Promise<LeaveRecord | null> {
  const row = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM work_preferences WHERE key = ?', `leave-${year}`);
  return row ? decodeStoredLeave(row.value, year) : null;
}
export async function saveLeave(record: LeaveRecord): Promise<void> {
  if (validateLeave(record)) throw new Error('INVALID_INPUT');
  await (await db()).runAsync('INSERT INTO work_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', `leave-${record.year}`, JSON.stringify(record));
}
export async function deleteMonth(month: string): Promise<void> { await (await db()).runAsync('DELETE FROM work_months WHERE month = ?', month); }
export async function deleteAll(): Promise<void> {
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => { await transaction.execAsync('DELETE FROM work_months; DELETE FROM work_preferences;'); });
  await connection.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
}

/** Read only the legacy acknowledgment, without loading financial records. */
export async function readDisclosureAcceptance(): Promise<boolean> {
  const row = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM work_preferences WHERE key = ?', 'disclosure-v1');
  return row?.value === 'accepted';
}
