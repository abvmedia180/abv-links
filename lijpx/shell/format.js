// Number and date formatting shared by the shell and the tools.

const ET_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' });
const ET_TIME = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const CALENDAR_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' });
const NUMBER = new Intl.NumberFormat('en-US');

// Weekday 0 is Monday, as in the payloads. Hour 0 is "12 AM".
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT = DAYS.map((day) => day.slice(0, 3));
export const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`);

// "April 6, 2026 2:30 PM ET". Newer ICU puts a narrow no-break space before AM/PM; use a plain space.
export function timestampET(date) {
  return `${ET_DATE.format(date)} ${ET_TIME.format(date).replace(/\u202f/g, ' ')} ET`;
}

// "2026-08-21" to "August 21, 2026".
export function calendarDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return CALENDAR_DATE.format(Date.UTC(year, month - 1, day));
}

// "2026-03-31" to "Mar 31".
export function shortDate(iso) {
  return SHORT_DATE.format(Date.parse(`${iso}T00:00:00Z`));
}

// "2026-03" to "Mar 2026".
export function monthLabel(month) {
  return MONTH.format(Date.parse(`${month}-01T00:00:00Z`));
}

// 12345.6 to "12,346".
export function whole(value) {
  return NUMBER.format(Math.round(value));
}

export function fixed(value, decimals = 1) {
  return value.toFixed(decimals);
}

// 3.24 to "+3.2", -3.24 to "-3.2". Rounded before the sign is chosen, so -0.03 reads "0.0", never "-0.0".
export function signed(value, decimals = 1) {
  const rounded = Number(value.toFixed(decimals)) || 0;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(decimals)}`;
}
