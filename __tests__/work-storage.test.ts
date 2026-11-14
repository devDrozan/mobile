import { emptyMonth } from '../src/modules/work/model';
import { blankLeave } from '../src/modules/work/leave';
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
const months = new Map<string, string>();
const preferences = new Map<string, string>();
let version = 0;
const runAsync = jest.fn(async (query: string, ...args: string[]) => {
  if (query.startsWith('INSERT INTO work_months')) months.set(args[0], args[1]);
  if (query.startsWith('INSERT INTO work_preferences')) preferences.set(args[0], args[1]);
  if (query.startsWith('DELETE FROM work_months WHERE')) months.delete(args[0]);
  return { changes: 1, lastInsertRowId: 1 };
});
const execAsync = jest.fn(async (query: string) => {
  if (query.includes('PRAGMA user_version = 1')) version = 1;
  if (query.includes('DELETE FROM work_months;')) months.clear();
  if (query.includes('DELETE FROM work_preferences;')) preferences.clear();
});
const connection = {
  runAsync, execAsync,
  closeAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async (query: string, ...args: string[]) => {
    if (query === 'PRAGMA user_version') return { user_version: version };
    if (query.includes('work_preferences')) return preferences.has(args[0]) ? { value: preferences.get(args[0]) } : null;
    if (query.includes('WHERE month =')) return months.has(args[0]) ? { payload: months.get(args[0]) } : null;
    const previous = [...months.keys()].filter(key => key < args[0]).sort().at(-1);
    return previous ? { month: previous, payload: months.get(previous) } : null;
  }),
  withExclusiveTransactionAsync: jest.fn(async (action: (transaction: { runAsync: typeof runAsync; execAsync: typeof execAsync }) => Promise<void>) => {
    const snapshot = new Map(months); const savedPreferences = new Map(preferences);
    try { await action({ runAsync, execAsync }); }
    catch (error) { months.clear(); snapshot.forEach((value, key) => months.set(key, value)); preferences.clear(); savedPreferences.forEach((value, key) => preferences.set(key, value)); throw error; }
  }),
};
function storage() {
  jest.resetModules();
  require('expo-sqlite').openDatabaseAsync.mockResolvedValue(connection);
  return require('../src/modules/work/storage.native') as typeof import('../src/modules/work/storage.native');
}
beforeEach(() => { months.clear(); preferences.clear(); version = 0; jest.clearAllMocks(); });
it('migrates once and restores saved values across a module restart with isolated month snapshots', async () => {
  const first = storage();
  expect((await first.loadMonth('2026-11')).consented).toBe(false);
  expect(version).toBe(1);
  const draft = emptyMonth('2026-11'); draft.settings.basicSalary = '2000000.50';
  await first.saveMonth(draft);
  const restarted = storage();
  expect((await restarted.loadMonth('2026-11')).draft.settings.basicSalary).toBe('2000000.50');
  const next = (await restarted.loadMonth('2026-12')).draft;
  expect(next.entries).toEqual([]); expect(next.settings.basicSalary).toBe('2000000.50');
  next.settings.basicSalary = '1'; await restarted.saveMonth(next);
  expect((await restarted.loadMonth('2026-11')).draft.settings.basicSalary).toBe('2000000.50');
});
it('deletes only the selected month or all salary records and consent', async () => {
  const store = storage(); await store.saveMonth(emptyMonth('2026-11')); await store.saveMonth(emptyMonth('2026-12'));
  await store.deleteMonth('2026-11'); expect(months.has('2026-11')).toBe(false); expect(months.has('2026-12')).toBe(true);
  await store.deleteAll(); expect(months.size).toBe(0); expect((await store.loadMonth('2026-12')).consented).toBe(false);
});
it('rejects corrupted stored records and unsupported future schemas without overwriting them', async () => {
  months.set('2026-11', '{"month":"2026-11","settings":null,"entries":[]}');
  await expect(storage().loadMonth('2026-11')).rejects.toThrow('INVALID_STORED_DATA');
  version = 2;
  await expect(storage().loadMonth('2026-11')).rejects.toThrow('UNSUPPORTED_STORAGE_VERSION');
  expect(months.size).toBe(1);
});
it('rejects writes outside daily hour relationships before saving', async () => {
  const draft = emptyMonth('2026-11'); draft.entries = [{ date: '2026-11-02', normalHours: '24', overtimeHours: '1', nightHours: '0' }];
  await expect(storage().saveMonth(draft)).rejects.toThrow('INVALID_INPUT'); expect(months.size).toBe(0);
});
it('rolls back a partial save if storing disclosure fails', async () => {
  const store = storage(); const original = emptyMonth('2026-11'); original.settings.basicSalary = '100';
  await store.saveMonth(original);
  const changed = emptyMonth('2026-11'); changed.settings.basicSalary = '200';
  runAsync.mockImplementationOnce(async (_query, ...args) => { months.set(args[0], args[1]); return { changes: 1, lastInsertRowId: 1 }; }).mockRejectedValueOnce(new Error('disk full'));
  await expect(store.saveMonth(changed)).rejects.toThrow('disk full');
  expect((await store.loadMonth('2026-11')).draft.settings.basicSalary).toBe('100');
});
it('stores flexible hour input as normalized decimal hours', async () => {
  const store = storage();
  const draft = emptyMonth('2026-11');
  draft.entries = [{ date: '2026-11-02', normalHours: '1:30', overtimeHours: '30', nightHours: '1.5' }];
  await store.saveMonth(draft);
  const saved = JSON.parse(months.get('2026-11')!);
  expect(saved.entries[0]).toEqual({ date: '2026-11-02', normalHours: '1.5', overtimeHours: '0.5', nightHours: '1.5' });
});
it('persists annual leave per year and clears it with all salary data', async () => {
  const store = storage();
  const leave = blankLeave(2026); leave.policy = 'yes'; leave.entitlementDays = '15'; leave.dates = ['2026-11-07'];
  await store.saveMonth(emptyMonth('2026-11'), leave);
  expect(await store.loadLeave(2026)).toEqual(leave);
  expect(await store.loadLeave(2027)).toBeNull();
  await store.deleteAll();
  expect(await store.loadLeave(2026)).toBeNull();
});
it('rejects invalid leave before writing month or leave data', async () => {
  const store = storage();
  const leave = blankLeave(2026); leave.policy = 'yes'; leave.entitlementDays = '400';
  await expect(store.saveMonth(emptyMonth('2026-11'), leave)).rejects.toThrow('INVALID_INPUT');
  expect(months.size).toBe(0);
  await expect(store.saveLeave(leave)).rejects.toThrow('INVALID_INPUT');
});
