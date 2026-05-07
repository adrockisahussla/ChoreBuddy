// ISO week math (UTC-safe, no timezone round-trip bugs).

export const getWeekOf = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const getEndOfWeek = (date: Date): number => {
  const d = new Date(date);
  const dayNum = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNum + 6);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const currentWeek = (): string => getWeekOf(new Date());

export const shiftWeek = (weekOf: string, delta: number): string => {
  const [y, w] = weekOf.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const w1Mon = new Date(jan4); w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
  const targetMon = new Date(w1Mon); targetMon.setUTCDate(w1Mon.getUTCDate() + (w - 1 + delta) * 7);
  const thu = new Date(targetMon); thu.setUTCDate(targetMon.getUTCDate() + 3);
  const isoYear = thu.getUTCFullYear();
  const isoJan4 = new Date(Date.UTC(isoYear, 0, 4));
  const isoJan4Day = (isoJan4.getUTCDay() + 6) % 7;
  const isoW1Mon = new Date(isoJan4); isoW1Mon.setUTCDate(isoJan4.getUTCDate() - isoJan4Day);
  const isoWeek = Math.round((targetMon.getTime() - isoW1Mon.getTime()) / (7 * 86400000)) + 1;
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
};

export const fmtRange = (weekOf: string): string => {
  const [y, w] = weekOf.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const w1Mon = new Date(jan4); w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
  const mon = new Date(w1Mon); mon.setUTCDate(w1Mon.getUTCDate() + (w - 1) * 7);
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return `Week of ${mon.toLocaleDateString('en-CA', opts)} – ${sun.toLocaleDateString('en-CA', { ...opts, year: 'numeric' })}`;
};
