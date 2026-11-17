// Single source of truth for UI helpers. Grade scale mirrors Backend/utils.py grade_for().
export const gradeFor = (t) => (t >= 70 ? 'A' : t >= 60 ? 'B' : t >= 50 ? 'C' : t >= 40 ? 'D' : 'E');
export const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

// Local calendar date as YYYY-MM-DD. Do NOT use toISOString() for this: it is UTC, so in
// Nairobi (UTC+3) it returns yesterday between 00:00 and 03:00.
export const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
