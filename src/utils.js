// Single source of truth for UI helpers. Grade scale mirrors Backend/utils.py grade_for().
export const gradeFor = (t) => (t >= 70 ? 'A' : t >= 60 ? 'B' : t >= 50 ? 'C' : t >= 40 ? 'D' : 'E');
export const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
