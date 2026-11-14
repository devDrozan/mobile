import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { decodeEntry, normalizeEntry, orderEntries, validMonth, type ExpenseEntry } from './model';
type Connection = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync' | 'runAsync' | 'execAsync'>;
let database: Promise<SQLiteDatabase> | undefined;
async function db() {
  if (!database) database = (async () => {
    const connection = await openDatabaseAsync('e9-expenses.db');
    try {
      await connection.execAsync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
      const version = await connection.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((version?.user_version ?? 0) > 1) throw new Error('UNSUPPORTED_EXPENSE_SCHEMA');
      if (!version?.user_version) await connection.withExclusiveTransactionAsync(async transaction => {
        await transaction.execAsync('CREATE TABLE IF NOT EXISTS expense_entries (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS expense_date ON expense_entries(date); CREATE TABLE IF NOT EXISTS expense_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;');
      });
      return connection;
    } catch (error) { await connection.closeAsync(); throw error; }
  })().catch(error => { database = undefined; throw error; });
  return database;
}
async function readEntries(connection: Connection) {
  const rows = await connection.getAllAsync<{ id: string; date: string; payload: string }>('SELECT id, date, payload FROM expense_entries');
  const seen = new Set<string>();
  return rows.map(row => {
    const entry = decodeEntry(row.payload);
    if (seen.has(entry.id) || row.id !== entry.id || row.date !== entry.date) throw new Error('CORRUPT_EXPENSES');
    seen.add(entry.id); return entry;
  });
}
export async function loadMonth(month: string): Promise<{ entries: ExpenseEntry[]; consented: boolean }> {
  if (!validMonth(month)) throw new Error('INVALID_MONTH');
  const connection = await db();
  const entries = await readEntries(connection);
  const consent = await connection.getFirstAsync<{ value: string }>('SELECT value FROM expense_preferences WHERE key = ?', 'disclosure-v1');
  return { entries: orderEntries(entries.filter(entry => entry.date.startsWith(`${month}-`))), consented: consent?.value === 'accepted' };
}
export async function saveEntry(input: ExpenseEntry, editing: boolean): Promise<ExpenseEntry> {
  const entry = normalizeEntry(input); const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => {
    const entries = await readEntries(transaction);
    const exists = entries.some(row => row.id === entry.id);
    if (editing ? !exists : exists) throw new Error(editing ? 'MISSING_EXPENSE' : 'DUPLICATE_EXPENSE');
    if (editing) await transaction.runAsync('UPDATE expense_entries SET date = ?, payload = ? WHERE id = ?', entry.date, JSON.stringify(entry), entry.id);
    else await transaction.runAsync('INSERT INTO expense_entries(id, date, payload) VALUES (?, ?, ?)', entry.id, entry.date, JSON.stringify(entry));
    await transaction.runAsync('INSERT INTO expense_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'disclosure-v1', 'accepted');
  });
  return entry;
}
export async function deleteEntry(id: string): Promise<void> {
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => {
    await readEntries(transaction); await transaction.runAsync('DELETE FROM expense_entries WHERE id = ?', id);
  });
}
export async function deleteMonth(month: string): Promise<void> {
  if (!validMonth(month)) throw new Error('INVALID_MONTH');
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => {
    await readEntries(transaction); await transaction.runAsync('DELETE FROM expense_entries WHERE date >= ? AND date < ?', `${month}-01`, `${month}-32`);
  });
}
export async function deleteAll(): Promise<void> {
  const connection = await db();
  await connection.withExclusiveTransactionAsync(async transaction => {
    await readEntries(transaction); await transaction.execAsync('DELETE FROM expense_entries; DELETE FROM expense_preferences;');
  });
}

/** Read only the legacy acknowledgment, without loading financial records. */
export async function readDisclosureAcceptance(): Promise<boolean> {
  const row = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM expense_preferences WHERE key = ?', 'disclosure-v1');
  return row?.value === 'accepted';
}
