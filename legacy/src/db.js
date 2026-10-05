// Client-side persistent voter registry.
//
// Holds the college voter roll used for registration, sign-in and the public
// "check your details" lookup. Ballot content never lives here: the ledger in
// chain.js keeps votes, this file only knows whether a voter has used theirs.
//
// Each record carries a role ('student' or 'admin'); students also carry the
// department and academic year that decide which elections they can vote in.

import { DEPARTMENTS, YEARS } from './college'

const DB_STORAGE_KEY = 'evoting_voters_db'
const SESSION_KEY = 'evoting_active_voter'

export const STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

function seedStudent([voterId, name, department, year, dob]) {
  return {
    voterId,
    password: dob,
    dob,
    name,
    role: 'student',
    department,
    year,
    state: 'Tamil Nadu',
    constituency: '',
    booth: '',
    email: `${name.split(' ')[0].toLowerCase()}@college.example.in`,
    mobile: '',
    registeredAt: '12 Sep 2026, 11:00 AM',
    status: 'Verified',
    hasVoted: false,
  }
}

// Pre-seeded records so the portal is reviewable without registering first.
const INITIAL_VOTERS = [
  {
    voterId: 'WXJ1892340',
    password: '1998-04-24',
    dob: '1998-04-24',
    name: 'Riya Sharma',
    role: 'student',
    department: 'aids',
    year: 4,
    state: 'Tamil Nadu',
    constituency: 'Metropolitan Ward 07',
    booth: 'Digital Polling Booth #42',
    email: 'riya.sharma@example.in',
    mobile: '98400 11223',
    registeredAt: '01 Sep 2026, 10:30 AM',
    status: 'Verified',
    hasVoted: false,
  },
  {
    voterId: 'KLR4920194',
    password: '1992-11-15',
    dob: '1992-11-15',
    name: 'Karthik Raman',
    role: 'student',
    department: 'cse',
    year: 3,
    state: 'Karnataka',
    constituency: 'National Constituency 14',
    booth: 'Central Civic E-Station #01',
    email: 'karthik.raman@example.in',
    mobile: '99000 44551',
    registeredAt: '05 Sep 2026, 02:15 PM',
    status: 'Verified',
    hasVoted: false,
  },
  {
    voterId: 'DLH8831920',
    password: '1989-08-30',
    dob: '1989-08-30',
    name: 'Pooja Verma',
    role: 'student',
    department: 'ece',
    year: 2,
    state: 'Delhi',
    constituency: 'Metropolitan Ward 07',
    booth: 'Digital Polling Booth #42',
    email: 'pooja.verma@example.in',
    mobile: '95550 77310',
    registeredAt: '10 Sep 2026, 09:45 AM',
    status: 'Verified',
    hasVoted: false,
  },
  ...[
    ['21AD014', 'Arjun Prakash', 'aids', 4, '2004-02-11'],
    ['22AD031', 'Kavya Ramesh', 'aids', 3, '2005-06-19'],
    ['23AD007', 'Naveen Raj', 'aids', 2, '2006-01-27'],
    ['21CS022', 'Divya Lakshmi', 'cse', 4, '2003-12-05'],
    ['23CS045', 'Harish Kumar', 'cse', 2, '2006-03-14'],
    ['22EC018', 'Sneha Iyer', 'ece', 3, '2005-09-02'],
    ['22EE009', 'Gokul Nathan', 'eee', 3, '2005-04-23'],
    ['21ME027', 'Sanjay Krishnan', 'mech', 4, '2003-10-30'],
    ['24CV003', 'Meena Sundaram', 'civil', 1, '2007-07-08'],
    // Enough students that every department has someone in every year.
    ['24AD011', 'Priya Dharshini', 'aids', 1, '2007-03-16'],
    ['21CS050', 'Pranav Menon', 'cse', 4, '2003-08-21'],
    ['24CS019', 'Rohan Das', 'cse', 1, '2007-05-02'],
    ['21EC033', 'Rakesh V', 'ece', 4, '2003-11-12'],
    ['24EC006', 'Anitha Joseph', 'ece', 1, '2007-01-25'],
    ['21EE005', 'Hari Prasad', 'eee', 4, '2003-06-09'],
    ['23EE021', 'Madhan K', 'eee', 2, '2006-02-17'],
    ['24EE012', 'Lokesh Kumar', 'eee', 1, '2007-09-30'],
    ['22ME008', 'Karan Singh', 'mech', 3, '2005-12-01'],
    ['23ME040', 'Ajith M', 'mech', 2, '2006-04-04'],
    ['24ME015', 'Surya Narayanan', 'mech', 1, '2007-10-19'],
    ['21CV002', 'Kaviya S', 'civil', 4, '2003-05-28'],
    ['22CV025', 'Rahul Venkat', 'civil', 3, '2005-08-13'],
    ['23CV017', 'Shalini Devi', 'civil', 2, '2006-07-22'],
  ].map(seedStudent),
  {
    voterId: 'ADMIN001',
    password: 'admin@2026',
    dob: '',
    name: 'Election Officer',
    role: 'admin',
    department: '',
    year: '',
    state: '',
    constituency: '',
    booth: '',
    email: 'elections@college.example.in',
    mobile: '',
    registeredAt: '01 Sep 2026, 09:00 AM',
    status: 'Verified',
    hasVoted: false,
  },
]

function timestamp() {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function persist(voters) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(voters))
  } catch (err) {
    console.error('Failed to save to voter database:', err)
  }
  return voters
}

export function getVoterDb() {
  try {
    const data = localStorage.getItem(DB_STORAGE_KEY)
    if (!data) return persist(INITIAL_VOTERS)
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed) || parsed.length === 0) return persist(INITIAL_VOTERS)
    // Records written by an earlier build used `dobPassword` and had no role,
    // department or year; seeded records get those filled back in.
    const records = parsed.map((voter) => {
      const seed = INITIAL_VOTERS.find((entry) => entry.voterId === voter.voterId)
      return {
        state: '',
        constituency: 'Metropolitan Ward 07',
        booth: 'Digital Polling Booth #42',
        role: seed?.role || 'student',
        department: seed?.department || '',
        year: seed?.year || '',
        ...voter,
        password: voter.password || voter.dobPassword || '',
        dob: voter.dob || voter.dobPassword || '',
      }
    })
    const missing = INITIAL_VOTERS.filter((seed) => !records.some((voter) => voter.voterId === seed.voterId))
    return [...records, ...missing]
  } catch (err) {
    console.error('Failed to load voter database:', err)
    return INITIAL_VOTERS
  }
}

export function normalizeVoterId(voterId) {
  return String(voterId || '').trim().toUpperCase()
}

export function findVoter(voterId) {
  const target = normalizeVoterId(voterId)
  return getVoterDb().find((voter) => voter.voterId === target) || null
}

export function registerVoter(form) {
  const name = String(form.name || '').trim()
  const voterId = normalizeVoterId(form.voterId)
  const password = String(form.password || '')
  const confirmPassword = String(form.confirmPassword ?? form.password ?? '')
  const dob = String(form.dob || '').trim()
  const state = String(form.state || '').trim()
  const department = String(form.department || '').trim()
  const year = Number(form.year) || ''

  if (!name) throw new Error('Full name is required.')
  if (!voterId) throw new Error('Register number is required.')
  if (voterId.length < 6) throw new Error('Register number must be at least 6 characters.')
  if (!dob) throw new Error('Date of birth is required.')
  if (!DEPARTMENTS.some((dept) => dept.id === department)) throw new Error('Please select your department.')
  if (!YEARS.some((entry) => entry.id === year)) throw new Error('Please select your academic year.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')
  if (password !== confirmPassword) throw new Error('Passwords do not match.')

  const voters = getVoterDb()
  if (voters.some((voter) => voter.voterId === voterId)) {
    throw new Error('This register number is already registered. Please sign in instead.')
  }

  const record = {
    voterId,
    password,
    dob,
    name,
    role: 'student',
    department,
    year,
    state,
    constituency: form.constituency || '',
    booth: form.booth || '',
    email: String(form.email || '').trim(),
    mobile: String(form.mobile || '').trim(),
    registeredAt: timestamp(),
    status: 'Verified',
    hasVoted: false,
  }

  const updated = [record, ...voters]
  persist(updated)
  return { voter: record, voters: updated }
}

export function authenticateVoter(voterId, password) {
  const id = normalizeVoterId(voterId)
  if (!id) throw new Error('Register number / username is required.')
  if (!password) throw new Error('Password is required.')

  const voter = getVoterDb().find((entry) => entry.voterId === id)
  if (!voter) throw new Error('No voter record found for this register number. Please register first.')
  if (voter.password !== password) throw new Error('Incorrect password. Please try again.')

  return voter
}

export function markVoted(voterId, hasVoted = true) {
  const id = normalizeVoterId(voterId)
  const voters = getVoterDb()
  const index = voters.findIndex((voter) => voter.voterId === id)
  if (index < 0) return voters
  voters[index] = { ...voters[index], hasVoted, votedAt: hasVoted ? timestamp() : null }
  return persist(voters)
}

// Admin edits from voter management: department, year and roll status only.
export function updateVoter(voterId, patch) {
  const id = normalizeVoterId(voterId)
  const voters = getVoterDb()
  const index = voters.findIndex((voter) => voter.voterId === id)
  if (index < 0) throw new Error('No voter record found for this register number.')
  const allowed = {}
  if ('department' in patch) allowed.department = patch.department
  if ('year' in patch) allowed.year = Number(patch.year) || ''
  if ('status' in patch) allowed.status = patch.status
  voters[index] = { ...voters[index], ...allowed }
  return persist(voters)
}

// Lookup for the public "Check Your Details" panel: register number or name,
// optionally narrowed to one department.
export function searchVoters(query, department) {
  const term = String(query || '').trim().toLowerCase()
  const deptFilter = String(department || '').trim()
  if (!term && !deptFilter) return []

  return getVoterDb().filter((voter) => {
    if (voter.role === 'admin') return false
    const matchesDept = !deptFilter || voter.department === deptFilter
    if (!term) return matchesDept
    const matchesTerm =
      voter.voterId.toLowerCase().includes(term) || String(voter.name || '').toLowerCase().includes(term)
    return matchesDept && matchesTerm
  })
}

export function saveSession(voterId) {
  try {
    if (voterId) localStorage.setItem(SESSION_KEY, normalizeVoterId(voterId))
    else localStorage.removeItem(SESSION_KEY)
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

export function loadSession() {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    return id ? findVoter(id) : null
  } catch (err) {
    console.error('Failed to load session:', err)
    return null
  }
}

export function resetVoterDb() {
  saveSession(null)
  return persist(INITIAL_VOTERS)
}
