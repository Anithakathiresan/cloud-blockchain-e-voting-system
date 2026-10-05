// Fixed college structure shared by the roll, the election registry and the UI.

export const DEPARTMENTS = [
  { id: 'aids', short: 'AI & DS', name: 'Artificial Intelligence & Data Science' },
  { id: 'cse', short: 'CSE', name: 'Computer Science & Engineering' },
  { id: 'ece', short: 'ECE', name: 'Electronics & Communication Engineering' },
  { id: 'eee', short: 'EEE', name: 'Electrical & Electronics Engineering' },
  { id: 'mech', short: 'Mechanical', name: 'Mechanical Engineering' },
  { id: 'civil', short: 'Civil', name: 'Civil Engineering' },
]

export const YEARS = [
  { id: 1, label: 'I Year' },
  { id: 2, label: 'II Year' },
  { id: 3, label: 'III Year' },
  { id: 4, label: 'IV Year' },
]

export function departmentLabel(id) {
  return DEPARTMENTS.find((dept) => dept.id === id)?.short || ''
}

export function departmentName(id) {
  return DEPARTMENTS.find((dept) => dept.id === id)?.name || ''
}

export function yearLabel(year) {
  return YEARS.find((entry) => entry.id === Number(year))?.label || ''
}

// "AI & DS • IV Year", or whichever half is known.
export function academicLine(department, year) {
  return [departmentLabel(department), yearLabel(year)].filter(Boolean).join(' • ')
}
