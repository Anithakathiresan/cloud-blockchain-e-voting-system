// Tiny hash router: "#/page" or "#/page/id". Keeps the back button, reloads
// and shared links working without a server-side route table.

export function parseHash(hash = window.location.hash) {
  const [page, ...rest] = hash.replace(/^#\/?/, '').split('/')
  const id = rest.length ? decodeURIComponent(rest.join('/')) : null
  return { page: page || '', id }
}

export function hashFor(page, id) {
  return id ? `#/${page}/${encodeURIComponent(id)}` : `#/${page}`
}

// Pages anyone can open. Signed-in users see the same pages inside the
// console layout; anything not listed here needs a session.
export const PUBLIC_PAGES = new Set([
  'home',
  'about',
  'services',
  'contact',
  'check',
  'electionInfo',
  'login',
  'register',
  'elections',
  'election',
  'candidates',
  'candidate',
  'results',
  'ledger',
  'notices',
  'news',
  'help',
])

// Public pages that are part of the marketing site rather than the console.
export const SITE_PAGES = new Set(['home', 'about', 'services', 'contact', 'check', 'electionInfo', 'login', 'register'])

export const ADMIN_PAGES = new Set([
  'manage-elections',
  'election-new',
  'election-edit',
  'candidate-verification',
  'voters',
  'departments',
  'department',
  'academic-years',
  'committees',
  'reports',
])

// Pages only a voting student can use.
export const STUDENT_PAGES = new Set(['vote', 'confirmation', 'receipts', 'receipt'])
