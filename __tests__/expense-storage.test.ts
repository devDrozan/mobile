import type { ExpenseEntry } from '../src/modules/expenses/model';
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
const records = new Map<string, { id: string; date: string; payload: string }>();
let version = 0, consent = false;
const execAsync = jest.fn(async (sql: string) => {
  if (sql.includes('PRAGMA user_version = 1')) version = 1;
  if (sql.includes('DELETE FROM expense_entries;')) records.clear();
  if (sql.includes('DELETE FROM expense_preferences;')) consent = false;
});
const runAsync = jest.fn(async (sql: string, ...args: string[]) => {
  if (sql.startsWith('INSERT INTO expense_entries')) records.set(args[0], { id: args[0], date: args[1], payload: args[2] });
  if (sql.startsWith('UPDATE expense_entries')) records.set(args[2], { id: args[2], date: args[0], payload: args[1] });
  if (sql.startsWith('INSERT INTO expense_preferences')) consent = true;
  if (sql.startsWith('DELETE FROM expense_entries WHERE id')) records.delete(args[0]);
  if (sql.startsWith('DELETE FROM expense_entries WHERE date')) for (const [id, row] of records) if (row.date >= args[0] && row.date < args[1]) records.delete(id);
  return { changes: 1, lastInsertRowId: 1 };
});
const connection = {
  execAsync, runAsync, closeAsync: jest.fn(async () => {}),
  getAllAsync: jest.fn(async () => [...records.values()]),
  getFirstAsync: jest.fn(async (sql: string) => sql === 'PRAGMA user_version' ? { user_version: version } : consent ? { value: 'accepted' } : null),
  withExclusiveTransactionAsync: jest.fn(async (callback: (db: unknown) => Promise<void>) => {
    const before = new Map(records), oldConsent = consent;
    try { await callback(connection); }
    catch (error) { records.clear(); before.forEach((row, id) => records.set(id, row)); consent = oldConsent; throw error; }
  }),
};
function store() {
  jest.resetModules(); require('expo-sqlite').openDatabaseAsync.mockResolvedValue(connection);
  return require('../src/modules/expenses/storage.native') as typeof import('../src/modules/expenses/storage.native');
}
const row = (id = 'e-1', date = '2026-11-07'): ExpenseEntry => ({ id, date, description: 'Synthetic groceries', category: 'food', amount: '123456789012345.000001' });
beforeEach(() => { records.clear(); version = 0; consent = false; jest.clearAllMocks(); });
it('migrates a separate DB and restores exact entries and consent after restart', async () => {
  const first = store(); expect((await first.loadMonth('2026-11')).consented).toBe(false);
  expect(require('expo-sqlite').openDatabaseAsync).toHaveBeenCalledWith('e9-expenses.db');
  expect(version).toBe(1); await first.saveEntry(row(), false);
  const second = store(); expect(await second.loadMonth('2026-11')).toEqual({ entries: [row()], consented: true });
  expect((await second.loadMonth('2026-12')).entries).toEqual([]);
});
it('moves an edit across months and rejects duplicate IDs or missing edits', async () => {
  const db = store(); await db.saveEntry(row(), false);
  await expect(db.saveEntry(row(), false)).rejects.toThrow('DUPLICATE_EXPENSE');
  await db.saveEntry(row('e-1', '2026-12-01'), true);
  expect((await db.loadMonth('2026-11')).entries).toEqual([]);
  expect((await db.loadMonth('2026-12')).entries).toEqual([row('e-1', '2026-12-01')]);
  await expect(db.saveEntry(row('missing'), true)).rejects.toThrow('MISSING_EXPENSE');
});
it('deletes a record, one month, or all expense records without opening salary storage', async () => {
  const db = store(); await db.saveEntry(row(), false); await db.saveEntry(row('e-2'), false); await db.saveEntry(row('e-3', '2026-12-01'), false);
  await db.deleteEntry('e-2'); expect(records.has('e-2')).toBe(false);
  await db.deleteMonth('2026-11'); expect([...records.keys()]).toEqual(['e-3']);
  await db.deleteAll(); expect(records.size).toBe(0); expect((await db.loadMonth('2026-12')).consented).toBe(false);
  expect(require('expo-sqlite').openDatabaseAsync.mock.calls.every((call: string[]) => call[0] === 'e9-expenses.db')).toBe(true);
});
it('rejects corruption/future schemas without overwriting data and rolls back partial saves', async () => {
  records.set('bad', { id: 'bad', date: '2026-11-07', payload: '{}' });
  await expect(store().loadMonth('2026-11')).rejects.toThrow(); expect(records.size).toBe(1);
  records.clear(); version = 2; await expect(store().loadMonth('2026-11')).rejects.toThrow('UNSUPPORTED_EXPENSE_SCHEMA');
  version = 0; const db = store(); await db.loadMonth('2026-11');
  runAsync.mockImplementationOnce(async (_sql, ...args) => { records.set(args[0], { id: args[0], date: args[1], payload: args[2] }); return { changes: 1, lastInsertRowId: 1 }; }).mockRejectedValueOnce(new Error('disk full'));
  await expect(db.saveEntry(row(), false)).rejects.toThrow('disk full'); expect(records.size).toBe(0);
});
