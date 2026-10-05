// The interface language for helpers that format outside React (dates,
// relative times, status labels). App sets it whenever the language changes.

const LOCALES = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }

const STATUS_LABELS = {
  en: { draft: 'Draft', upcoming: 'Upcoming', open: 'Voting Open', closed: 'Closed' },
  ta: { draft: 'வரைவு', upcoming: 'வரவிருக்கிறது', open: 'வாக்குப்பதிவு நடக்கிறது', closed: 'முடிந்தது' },
  hi: { draft: 'ड्राफ्ट', upcoming: 'आगामी', open: 'मतदान जारी', closed: 'बंद' },
}

let current = 'en'

export function setUiLanguage(code) {
  current = LOCALES[code] ? code : 'en'
}

export function uiLanguage() {
  return current
}

export function dateLocale() {
  return LOCALES[current]
}

export function statusLabel(status) {
  return STATUS_LABELS[current][status] || STATUS_LABELS.en[status]
}

// Replaces {name} placeholders with values.
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match))
}

// Counted text: uses `${key}_one` when n is 1, otherwise `key`. {n} is the count.
export function countText(t, key, n, vars = {}) {
  const template = (n === 1 && t[`${key}_one`]) || t[key]
  return fill(template, { n, ...vars })
}
