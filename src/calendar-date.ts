/** Calendar dates are Korean civil dates, independent of device timezone. */
export function koreaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(value => value.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function defaultSelectedDate(month: string, now = new Date()): string {
  const today = koreaToday(now);
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}
