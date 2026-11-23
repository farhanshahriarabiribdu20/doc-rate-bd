// Quality grade shown as a badge on a chick rate. Missing grade = 'A' (the original behaviour).
export const GRADES = ['A', 'B', 'C', 'none'];

export const GRADE_STYLE = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-amber-500 text-white',
  C: 'bg-slate-500 text-white'
};

export const normalizeGrade = (g) => (GRADES.includes(g) ? g : 'A');
