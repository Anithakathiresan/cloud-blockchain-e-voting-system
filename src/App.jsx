import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Gavel,
  IdCard,
  ListChecks,
  MapPin,
  ScrollText,
  Search,
  ShieldCheck,
  UserPlus,
  Vote,
  X,
} from 'lucide-react'
import { translations } from './translations'
import { siteText } from './siteText'
import { uiText } from './uiText'
import { dashText } from './dashText'
import { setUiLanguage } from './locale'
import { AppContext } from './context'
import { ADMIN_PAGES, PUBLIC_PAGES, SITE_PAGES, STUDENT_PAGES, hashFor, parseHash } from './router'
import { DEPARTMENTS, departmentLabel, yearLabel } from './college'
import {
  authenticateVoter,
  getVoterDb,
  loadSession,
  markVoted,
  registerVoter,
  resetVoterDb,
  saveSession,
  updateVoter,
} from './db'
import {
  addBallotBlock,
  addElectionBallot,
  ensureGenesis,
  findBallotByVoterHash,
  hashVoterId,
  loadChain,
  resetChain,
  seedLedger,
  verifyChain,
} from './chain'
import {
  REGISTRY_KEY,
  addNotice,
  demoBallots,
  loadRegistry,
  logActivity,
  patchElection,
  removeElection,
  removeNotice,
  resetRegistry,
  saveElection,
  saveRegistry,
  setCommitteeHolder,
  upsertCandidate,
} from './store'
import {
  electionStatus,
  isEligible,
  nextScheduleChange,
  resultsVisible,
  tallyElection,
  validateSelections,
} from './elections'
import { ConsoleLayout, PublicLayout } from './components/Layout'
import { ErrorBoundary } from './components/ui'
import { SignInIntro } from './components/SignInIntro'
import { CheckDetails, HomePage } from './pages/HomePage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { AdminDashboard, ProfilePage, StudentDashboard } from './pages/Dashboard'
import { ElectionDetailPage, ElectionsPage } from './pages/ElectionPages'
import { CandidateProfilePage, CandidatesPage } from './pages/CandidatePages'
import { ConfirmationPage, VotePage } from './pages/VotePage'
import { BallotPage } from './pages/BallotPage'
import { ResultsPage } from './pages/ResultsPage'
import { LedgerPage, ReceiptPage, ReceiptsPage } from './pages/ReceiptPages'
import { HelpPage, NotFoundPage, NoticesPage, RestrictedPage, SettingsPage } from './pages/SystemPages'
import { AboutPage, ContactPage, ElectionInfoPage, ServicesPage } from './pages/InfoPages'
import { ElectionManagementPage } from './pages/admin/ElectionManagement'
import { ElectionWizardPage } from './pages/admin/ElectionWizard'
import { CandidateManagementPage } from './pages/admin/CandidateManagement'
import { VoterManagementPage } from './pages/admin/VoterManagement'
import { AcademicYearsPage, DepartmentDetailPage, DepartmentsPage } from './pages/admin/Departments'
import { CommitteesPage } from './pages/admin/Committees'
import { ReportsPage } from './pages/admin/Reports'

const languages = [
  { code: 'en', label: 'English', subLabel: 'English' },
  { code: 'ta', label: 'தமிழ்', subLabel: 'Tamil' },
  { code: 'hi', label: 'हिन्दी', subLabel: 'Hindi' },
]

const THEME_KEY = 'evoting_theme'
const LANG_KEY = 'evoting_language'
const DEMO_LEDGER_KEY = 'evoting_demo_ledger'

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferences are conveniences; the app works without them.
  }
}

// A ledger with no ballots yet is replaced once by the demo ledger, so the
// explorer, receipts and participation figures have data to show. Ledgers
// that already hold ballots are never touched.
// Concurrent callers (StrictMode runs effects twice) share one run.
let ledgerPreparation = null

function prepareLedger() {
  ledgerPreparation ||= (async () => {
    if (readStorage(DEMO_LEDGER_KEY) || loadChain().some((block) => block.type === 'ballot')) return ensureGenesis()
    const entries = demoBallots()
    const chain = await seedLedger(entries, new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
    new Set(entries.map((entry) => entry.voterId)).forEach((id) => markVoted(id, true))
    writeStorage(DEMO_LEDGER_KEY, '1')
    return chain
  })().finally(() => {
    ledgerPreparation = null
  })
  return ledgerPreparation
}

function initialRoute(signedIn) {
  const parsed = parseHash()
  if (parsed.page) return parsed
  const page = signedIn ? 'dashboard' : 'home'
  window.history.replaceState(null, '', hashFor(page))
  return { page, id: null }
}

const routeKey = (entry) => `${entry.page}/${entry.id ?? ''}`

// Page changes run through the browser's View Transitions API, so the old page
// fades out and the new one rises in. Browsers without it, and users who ask
// for reduced motion, get the plain instant swap.
function withPageTransition(update) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduce) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

function App() {
  const [language, setLanguage] = useState(() => readStorage(LANG_KEY) || 'en')
  const [theme, setTheme] = useState(() => (readStorage(THEME_KEY) === 'dark' ? 'dark' : 'light'))
  const [voters, setVoters] = useState(() => getVoterDb())
  const [voter, setVoter] = useState(() => loadSession())
  const [route, setRoute] = useState(() => initialRoute(Boolean(loadSession())))
  // Pages visited this session, so Back returns to where the user came from.
  const [trail, setTrail] = useState(() => [parseHash()])
  const [registry, setRegistry] = useState(() => loadRegistry())
  const [chain, setChain] = useState(() => loadChain())
  const [ledger, setLedger] = useState(() => ({ status: 'checking', blocks: loadChain().length, brokenAt: null }))
  const [verifyTick, setVerifyTick] = useState(0)
  const [receipts, setReceipts] = useState({})
  const [receiptsReady, setReceiptsReady] = useState(false)
  const [ballotDrafts, setBallotDrafts] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState(null)
  // The page a Sign in click came from, while the intro scene plays over it.
  const [signInFrom, setSignInFrom] = useState(null)
  const toastTimer = useRef(null)

  // English is the fallback for any key a language does not define.
  const t = useMemo(() => {
    // Dates, relative times and status labels read the language from here.
    setUiLanguage(language)
    return {
      ...translations.en,
      ...siteText.en,
      ...uiText.en,
      ...dashText.en,
      ...(translations[language] || {}),
      ...(siteText[language] || {}),
      ...(uiText[language] || {}),
      ...(dashText[language] || {}),
    }
  }, [language])

  const isAdmin = voter?.role === 'admin'

  // ------------------------------------------------------------ effects ---

  const moveTo = useCallback((next) => {
    setRoute(next)
    setTrail((stack) => {
      const key = routeKey(next)
      // Browser back to the page before this one: step the trail back too.
      if (stack.length > 1 && routeKey(stack[stack.length - 2]) === key) return stack.slice(0, -1)
      if (stack.length && routeKey(stack[stack.length - 1]) === key) return stack
      return [...stack, next]
    })
  }, [])

  useEffect(() => {
    const onHash = () =>
      withPageTransition(() => {
        moveTo(parseHash())
        window.scrollTo({ top: 0 })
      })
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [moveTo])

  useEffect(() => {
    let cancelled = false
    prepareLedger().then((started) => {
      if (cancelled) return
      setChain(started)
      setVoters(getVoterDb())
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Re-run the full hash/link verification whenever the ledger changes.
  useEffect(() => {
    let cancelled = false
    setLedger((prev) => ({ ...prev, status: 'checking' }))
    verifyChain(chain).then((result) => {
      if (cancelled) return
      setLedger({ status: result.valid ? 'valid' : 'broken', blocks: result.blocks, brokenAt: result.brokenAt })
    })
    return () => {
      cancelled = true
    }
  }, [chain, verifyTick])

  useEffect(() => {
    saveRegistry(registry)
  }, [registry])

  // Pick up notices and elections saved from another tab (an officer posting
  // while a student is signed in elsewhere). Saving the same text back does
  // not fire another storage event, so the tabs do not ping-pong.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== REGISTRY_KEY || !event.newValue) return
      try {
        const next = JSON.parse(event.newValue)
        if (Array.isArray(next?.elections)) setRegistry(next)
      } catch {
        // A half-written or foreign value: keep what this tab has.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Statuses move from upcoming → open → closed with the clock.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // …and flip at the exact scheduled second rather than on the next tick.
  useEffect(() => {
    const next = nextScheduleChange(registry.elections, now)
    if (next === null) return undefined
    // setTimeout caps at ~24.8 days; the 30 s tick re-arms it later.
    const wait = Math.min(next - Date.now() + 50, 2 ** 31 - 1)
    const timer = setTimeout(() => setNow(Date.now()), Math.max(wait, 0))
    return () => clearTimeout(timer)
  }, [registry.elections, now])

  // Find the signed-in student's own ballot in every election.
  const voterId = voter?.voterId
  useEffect(() => {
    let cancelled = false
    if (!voterId || isAdmin) {
      setReceipts({})
      setReceiptsReady(true)
      return undefined
    }
    setReceiptsReady(false)
    Promise.all(
      registry.elections.map(async (election) => {
        const digest = await hashVoterId(voterId, election.legacy ? undefined : election.id)
        return [election.id, findBallotByVoterHash(digest, chain, election.legacy ? null : election.id)]
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setReceipts(Object.fromEntries(entries.filter(([, block]) => block)))
        setReceiptsReady(true)
      })
      .catch((err) => {
        console.error('Failed to look up receipts:', err)
        if (!cancelled) setReceiptsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [voterId, isAdmin, chain, registry.elections])

  useEffect(() => {
    writeStorage(THEME_KEY, theme)
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131D3B' : '#DFF0D8')
  }, [theme])

  useEffect(() => {
    writeStorage(LANG_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // ------------------------------------------------------------- helpers ---

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  const navigate = useCallback((page, id = null) => {
    const hash = hashFor(page, id)
    if (window.location.hash === hash) {
      withPageTransition(() => {
        moveTo({ page, id })
        window.scrollTo({ top: 0 })
      })
    } else {
      window.location.hash = hash
    }
  }, [moveTo])

  // Signed-in users skip the sign-in and registration screens.
  useEffect(() => {
    if (voter && (route.page === 'login' || route.page === 'register')) navigate('dashboard')
  }, [voter, route.page, navigate])

  // Once the page changes, the sign-in scene is spent; coming back to the page
  // it started from must not replay it.
  useEffect(() => {
    setSignInFrom((from) => (from && from !== `${route.page}/${route.id}` ? null : from))
  }, [route.page, route.id])

  const candidates = useMemo(
    () =>
      registry.candidates.map((entry) =>
        entry.i18nKey && t[entry.i18nKey]
          ? {
              ...entry,
              name: t[entry.i18nKey].name,
              panel: t[entry.i18nKey].party,
              manifesto: t[entry.i18nKey].manifesto,
            }
          : entry,
      ),
    [registry.candidates, t],
  )

  const elections = useMemo(
    () => (isAdmin ? registry.elections : registry.elections.filter((election) => election.published)),
    [registry.elections, isAdmin],
  )

  const stateMap = useMemo(() => {
    const map = {}
    registry.elections.forEach((election) => {
      const status = electionStatus(election, now)
      map[election.id] = {
        status,
        eligible: isEligible(voter, election, registry.committee),
        voted: Boolean(receipts[election.id]),
        resultsVisible: resultsVisible(election, status),
      }
    })
    return map
  }, [registry.elections, registry.committee, voter, receipts, now])

  const electionState = useCallback(
    (election) =>
      stateMap[election?.id] || { status: 'draft', eligible: false, voted: false, resultsVisible: false },
    [stateMap],
  )

  const tallies = useMemo(() => {
    const map = {}
    registry.elections.forEach((election) => {
      const field = candidates.filter((entry) => entry.electionId === election.id && entry.status === 'verified')
      map[election.id] = tallyElection(election, field, chain, electionStatus(election, now))
    })
    return map
  }, [registry.elections, candidates, chain, now])

  const updateRegistry = useCallback((fn) => setRegistry((prev) => fn(prev)), [])

  // --------------------------------------------------------------- auth ---

  const login = (id, password) => {
    const record = authenticateVoter(id, password)
    setVoter(record)
    saveSession(record.voterId)
    setVoters(getVoterDb())
    setBallotDrafts({})
    setTrail([])
    navigate('dashboard')
    showToast(`${t.signedInAs} ${record.name}`)
  }

  const register = (form) => {
    const { voter: record, voters: updated } = registerVoter(form)
    setVoters(updated)
    setVoter(record)
    saveSession(record.voterId)
    setTrail([])
    navigate('dashboard')
    showToast(t.registerSuccess)
  }

  const logout = () => {
    setVoter(null)
    saveSession(null)
    setBallotDrafts({})
    setTrail([])
    navigate('home')
  }

  // ------------------------------------------------------------- ballot ---

  const setBallotDraft = useCallback((electionId, selections) => {
    setBallotDrafts((prev) => ({ ...prev, [electionId]: selections }))
  }, [])

  // From a candidate profile: add them to the draft ballot, open the ballot.
  const pickCandidate = (election, candidate) => {
    const current = ballotDrafts[election.id] || {}
    const picks = current[candidate.positionId] || []
    let next = [candidate.id]
    if (election.method === 'ranked') next = picks.includes(candidate.id) ? picks : [...picks, candidate.id]
    if (election.method === 'multiple') {
      const seats = election.positions.find((position) => position.id === candidate.positionId)?.seats || 1
      next = picks.includes(candidate.id) ? picks : [...picks, candidate.id].slice(0, seats)
    }
    setBallotDraft(election.id, { ...current, [candidate.positionId]: next })
    navigate('vote', election.id)
  }

  const castBallot = async (election, selections) => {
    const state = electionState(election)
    if (!voter || isAdmin) throw new Error('Sign in as a student to vote.')
    if (state.status !== 'open') throw new Error('Voting for this election is not open.')
    if (!state.eligible) throw new Error('You are not eligible to vote in this election.')
    if (state.voted) throw new Error('Your ballot for this election is already recorded.')
    const field = candidates.filter((entry) => entry.electionId === election.id && entry.status === 'verified')
    const problem = validateSelections(election, field, selections)
    if (problem) throw new Error(problem)

    // Keep only the positions that are on the ballot.
    const clean = Object.fromEntries(
      election.positions
        .filter((position) => (selections[position.id] || []).length)
        .map((position) => [position.id, selections[position.id]]),
    )
    const { block, chain: next } = election.legacy
      ? await addBallotBlock(voter.voterId, clean[election.positions[0].id][0])
      : await addElectionBallot(voter.voterId, election.id, clean)

    const updatedVoters = markVoted(voter.voterId, true)
    setChain(next)
    setVoters(updatedVoters)
    setVoter(updatedVoters.find((entry) => entry.voterId === voter.voterId) || voter)
    setReceipts((prev) => ({ ...prev, [election.id]: block }))
    setBallotDrafts((prev) => {
      const rest = { ...prev }
      delete rest[election.id]
      return rest
    })
    showToast(t.voteSuccess)
    return block
  }

  const goToVote = () => navigate(voter ? 'vote' : 'login')

  // Sign in buttons play the short ballot-unit scene, then open the login page.
  // Reduced motion, or already being on the login page, goes straight there.
  const signIn = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || route.page === 'login') {
      navigate('login')
      return
    }
    setSignInFrom(`${route.page}/${route.id}`)
  }

  // The voter card is the student's own roll entry, written out as text.
  const downloadCard = () => {
    if (!voter) {
      navigate('login')
      return
    }
    const lines = [
      'College E-Voting — Voter Card',
      '='.repeat(48),
      `${t.colName}: ${voter.name}`,
      `Register number: ${voter.voterId}`,
      `Department: ${departmentLabel(voter.department) || '-'}`,
      `Academic year: ${yearLabel(voter.year) || '-'}`,
      `${t.dobLabel}: ${voter.dob || '-'}`,
      `${t.accountStatus}: ${voter.status}`,
      `${t.registeredOn}: ${voter.registeredAt}`,
      '='.repeat(48),
      t.footerLegal,
    ]
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voter-card-${voter.voterId}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(t.epicDownloaded)
    } catch (err) {
      showToast(err.message || 'Unable to prepare the voter card.', 'error')
    }
  }

  // -------------------------------------------------------------- admin ---

  const lockedCandidate = (id) => {
    const record = registry.candidates.find((entry) => entry.id === id)
    const election = record && registry.elections.find((entry) => entry.id === record.electionId)
    return !election || ['open', 'closed'].includes(electionStatus(election, now))
  }

  const admin = {
    saveElection: (election, field, { publish, isNew }) => {
      const verb = publish ? 'published' : isNew ? 'created as draft' : 'updated'
      updateRegistry((prev) => logActivity(saveElection(prev, election, field), `Election ${verb}: ${election.title}`))
      showToast(`${election.title} ${verb}.`)
    },
    publishElection: (id) => {
      const election = registry.elections.find((entry) => entry.id === id)
      updateRegistry((prev) => logActivity(patchElection(prev, id, { published: true }), `Election published: ${election.title}`))
      showToast(`${election.title} is published.`)
    },
    closeElection: (id) => {
      const election = registry.elections.find((entry) => entry.id === id)
      updateRegistry((prev) =>
        logActivity(patchElection(prev, id, { closedAt: new Date().toISOString() }), `Election closed: ${election.title}`),
      )
      showToast(`Voting for ${election.title} is closed.`)
    },
    deleteElection: (id) => {
      const election = registry.elections.find((entry) => entry.id === id)
      updateRegistry((prev) => logActivity(removeElection(prev, id), `Election deleted: ${election.title}`))
      showToast(`${election.title} was deleted.`)
    },
    saveCandidate: (record, isNew) => {
      // Translated seed candidates keep their names in the dictionaries.
      const stored = { ...record }
      if (stored.i18nKey) {
        delete stored.name
        delete stored.panel
        delete stored.manifesto
      }
      updateRegistry((prev) =>
        logActivity(upsertCandidate(prev, stored), `${isNew ? 'Nomination added' : 'Candidate updated'}: ${record.name}`),
      )
      showToast(isNew ? `${record.name} added as pending.` : `${record.name} updated.`)
    },
    setCandidateStatus: (id, status, reason = '') => {
      const record = candidates.find((entry) => entry.id === id)
      if (lockedCandidate(id)) {
        showToast('Reviews are locked once voting opens.', 'error')
        return
      }
      updateRegistry((prev) =>
        logActivity(
          upsertCandidate(prev, { id, status, rejectionReason: status === 'rejected' ? reason : '', reviewedAt: new Date().toISOString() }),
          `Candidate ${status}: ${record?.name}`,
        ),
      )
      showToast(`${record?.name} marked ${status}.`, status === 'rejected' ? 'error' : 'success')
    },
    updateVoter: (id, patch) => {
      try {
        const updated = updateVoter(id, patch)
        setVoters(updated)
        if (voter?.voterId === id) setVoter(updated.find((entry) => entry.voterId === id))
        updateRegistry((prev) => logActivity(prev, `Voter record updated: ${id}`))
        showToast('Voter record updated.')
      } catch (err) {
        showToast(err.message, 'error')
      }
    },
    postNotice: (notice) => {
      updateRegistry((prev) => logActivity(addNotice(prev, notice), `Notice posted: ${notice.title}`))
      showToast('Notice published.')
    },
    deleteNotice: (id) => {
      updateRegistry((prev) => removeNotice(prev, id))
      showToast('Notice deleted.')
    },
    assignCommittee: (slot, holder) => {
      updateRegistry((prev) =>
        logActivity(setCommitteeHolder(prev, slot, holder), `Committee updated: ${slot.label} — ${holder?.name || 'vacant'}`),
      )
      showToast('Committee updated.')
    },
    resetDemo: async () => {
      resetChain()
      try {
        localStorage.removeItem(DEMO_LEDGER_KEY)
      } catch {
        // The demo ledger is then simply not re-seeded.
      }
      resetVoterDb()
      setRegistry(resetRegistry())
      setVoter(null)
      setReceipts({})
      setBallotDrafts({})
      setChain(await prepareLedger())
      setVoters(getVoterDb())
      setTrail([])
      navigate('home')
      showToast('Demo data restored.')
    },
  }

  const pendingCount = isAdmin ? registry.candidates.filter((entry) => entry.status === 'pending').length : 0

  const context = {
    t,
    language,
    setLanguage,
    languages,
    theme,
    setTheme,
    toggleTheme: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
    route,
    navigate,
    voter,
    voters,
    isAdmin,
    login,
    register,
    logout,
    registry,
    elections,
    candidates,
    committee: registry.committee,
    notices: registry.notices,
    chain,
    ledger,
    reverify: () => setVerifyTick((value) => value + 1),
    now,
    receipts,
    receiptsReady,
    electionState,
    tallies,
    ballotDrafts,
    setBallotDraft,
    pickCandidate,
    castBallot,
    goToVote,
    signIn,
    downloadCard,
    showToast,
    admin,
    pendingCount,
  }

  // ------------------------------------------------------------ routing ---

  const { page, id } = route
  const findElection = () => registry.elections.find((entry) => entry.id === id)
  const findCandidate = () => candidates.find((entry) => entry.id === id)

  const views = {
    dashboard: () => ({
      title: t.navDashboard,
      crumbs: [{ label: t.navDashboard }],
      element: isAdmin ? <AdminDashboard /> : <StudentDashboard />,
    }),
    elections: () => ({ title: t.uiElections, crumbs: [{ label: t.uiElections }], element: <ElectionsPage /> }),
    election: () => {
      const election = findElection()
      const title = election && (election.published || isAdmin) ? election.title : t.uiElections
      return {
        title,
        crumbs: [{ label: t.uiElections, page: 'elections' }, { label: title }],
        element: <ElectionDetailPage id={election && (election.published || isAdmin) ? id : null} />,
      }
    },
    candidates: () => ({ title: t.uiCandidates, crumbs: [{ label: t.uiCandidates }], element: <CandidatesPage /> }),
    candidate: () => {
      const record = findCandidate()
      return {
        title: record?.name || t.uiCandidates,
        crumbs: [{ label: t.uiCandidates, page: 'candidates' }, { label: record?.name || 'Profile' }],
        element: <CandidateProfilePage id={id} />,
      }
    },
    vote: () => ({
      title: t.uiCastVote,
      crumbs: id ? [{ label: t.uiCastVote, page: 'vote' }, { label: findElection()?.title || 'Ballot' }] : [{ label: t.uiCastVote }],
      element: <VotePage key={id || 'chooser'} id={id} />,
    }),
    confirmation: () => ({
      title: t.uiVoteRecorded,
      crumbs: [{ label: t.uiCastVote, page: 'vote' }, { label: t.uiStepReceipt }],
      element: <ConfirmationPage id={id} />,
    }),
    ballot: () => {
      const election = findElection()
      return {
        title: t.uiCastVote,
        crumbs: [{ label: t.navHome, page: 'home' }, { label: election?.published ? election.title : 'Ballot' }],
        element: <BallotPage key={id} id={id} />,
      }
    },
    results: () => ({ title: t.uiResults, crumbs: [{ label: t.uiResults }], element: <ResultsPage id={id} /> }),
    receipts: () => ({ title: t.uiMyReceipts, crumbs: [{ label: t.uiMyReceipts }], element: <ReceiptsPage /> }),
    receipt: () => ({
      title: t.voteReceipt,
      crumbs: [{ label: t.uiMyReceipts, page: 'receipts' }, { label: findElection()?.title || t.voteReceipt }],
      element: <ReceiptPage id={id} />,
    }),
    notices: () => ({ title: t.uiNotices, crumbs: [{ label: t.uiNotices }], element: <NoticesPage /> }),
    news: () => ({ title: t.uiNotices, crumbs: [{ label: t.uiNotices }], element: <NoticesPage /> }),
    ledger: () => ({ title: t.uiLedger, crumbs: [{ label: t.uiLedger }], element: <LedgerPage /> }),
    profile: () => ({ title: t.uiProfile, crumbs: [{ label: t.uiProfile }], element: <ProfilePage /> }),
    settings: () => ({ title: t.uiSettings, crumbs: [{ label: t.uiSettings }], element: <SettingsPage /> }),
    help: () => ({ title: t.uiHelp, crumbs: [{ label: t.uiHelp }], element: <HelpPage /> }),
    check: () => ({ title: t.checkPageTitle, crumbs: [{ label: t.checkPageTitle }], element: <CheckDetails standalone /> }),
    'manage-elections': () => ({
      title: t.uiElectionManagement,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiElectionManagement }],
      element: <ElectionManagementPage />,
    }),
    'election-new': () => ({
      title: 'Create Election',
      crumbs: [{ label: t.uiElectionManagement, page: 'manage-elections' }, { label: 'Create' }],
      element: <ElectionWizardPage key="new" />,
    }),
    'election-edit': () => ({
      title: 'Edit Election',
      crumbs: [{ label: t.uiElectionManagement, page: 'manage-elections' }, { label: findElection()?.title || 'Edit' }],
      element: <ElectionWizardPage key={id} id={id} />,
    }),
    'candidate-verification': () => ({
      title: t.uiCandidateVerification,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiCandidateVerification }],
      element: <CandidateManagementPage />,
    }),
    voters: () => ({
      title: t.uiVoterManagement,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiVoterManagement }],
      element: <VoterManagementPage />,
    }),
    departments: () => ({
      title: t.uiDepartments,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiDepartments }],
      element: <DepartmentsPage />,
    }),
    department: () => {
      const dept = DEPARTMENTS.find((entry) => entry.id === id)
      return {
        title: dept ? `${dept.short} Department` : t.uiDepartments,
        crumbs: [{ label: t.uiDepartments, page: 'departments' }, { label: dept?.short || 'Department' }],
        element: <DepartmentDetailPage id={id} />,
      }
    },
    'academic-years': () => ({
      title: t.uiAcademicYears,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiAcademicYears }],
      element: <AcademicYearsPage />,
    }),
    committees: () => ({
      title: t.uiCommittees,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiCommittees }],
      element: <CommitteesPage />,
    }),
    reports: () => ({
      title: t.uiReports,
      crumbs: [{ label: t.uiAdministration }, { label: t.uiReports }],
      element: <ReportsPage />,
    }),
  }

  const sitePages = {
    home: <HomePage />,
    about: <AboutPage />,
    services: <ServicesPage />,
    contact: <ContactPage />,
    electionInfo: <ElectionInfoPage />,
    login: <LoginPage />,
    register: <RegisterPage />,
  }

  let view
  if (!voter && !PUBLIC_PAGES.has(page) && (views[page] || ADMIN_PAGES.has(page))) {
    view = { site: true, element: <LoginPage notice={t.loginRequiredCopy} /> }
  } else if (SITE_PAGES.has(page) && page !== 'check') {
    view = { site: true, element: sitePages[page] }
  } else if (page === 'check' && !voter) {
    view = { site: true, element: <CheckDetails standalone /> }
  } else if (views[page]) {
    view = views[page]()
    if (ADMIN_PAGES.has(page) && !isAdmin) {
      view = { title: 'Access restricted', crumbs: [{ label: 'Access restricted' }], element: <RestrictedPage reason="This page is only available to election officers." /> }
    } else if (STUDENT_PAGES.has(page) && isAdmin) {
      view = {
        ...view,
        element: <RestrictedPage reason="Election officers cannot vote or hold receipts from the admin account. Sign in as a student to vote." />,
      }
    }
  } else {
    view = { title: 'Page not found', crumbs: [{ label: 'Not found' }], element: <NotFoundPage /> }
  }

  // ------------------------------------------------------------ back bar ---

  // Back goes to the previous page in the trail, or else to the page's parent.
  const currentKey = routeKey(route)
  const reachable = (entry) =>
    routeKey(entry) !== currentKey && !(voter && (entry.page === 'login' || entry.page === 'register'))
  const previousIndex = trail.findLastIndex(reachable)
  let backTarget = previousIndex >= 0 ? trail[previousIndex] : null
  if (!backTarget) {
    const parent = view.crumbs?.slice(0, -1).findLast((crumb) => crumb.page)
    if (parent) backTarget = { page: parent.page, id: parent.id ?? null }
    else if (!view.site && page !== 'dashboard') backTarget = { page: 'dashboard', id: null }
    else if (page === 'register') backTarget = { page: 'login', id: null }
    else if (page !== 'home') backTarget = { page: 'home', id: null }
  }

  const siteLabels = {
    home: t.navHome,
    about: t.navAboutSite,
    services: t.navServicesSite,
    contact: t.navContact,
    electionInfo: t.menuElectionInfo,
    login: t.loginTitle,
    register: t.registerLink,
    check: t.checkPageTitle,
  }
  const labelFor = ({ page: target, id: targetId }) => {
    if (siteLabels[target]) return siteLabels[target]
    if (target === 'election' || target === 'election-edit') {
      return registry.elections.find((entry) => entry.id === targetId)?.title || t.uiElections
    }
    if (target === 'candidate') return candidates.find((entry) => entry.id === targetId)?.name || t.uiCandidates
    if (target === 'department') return DEPARTMENTS.find((entry) => entry.id === targetId)?.short || t.uiDepartments
    return views[target]?.().title || t.navHome
  }

  const back = backTarget && {
    label: labelFor(backTarget),
    go: () => {
      if (previousIndex >= 0) setTrail((stack) => stack.slice(0, previousIndex + 1))
      navigate(backTarget.page, backTarget.id)
    },
  }

  useEffect(() => {
    document.title = view.title ? `${view.title} · College E-Voting` : 'College E-Voting System'
  })

  // Home and every signed-in console page scroll without a visible scroll bar.
  const consolePage = Boolean(voter) && !view.site
  useEffect(() => {
    const hide = route.page === 'home' || consolePage
    document.documentElement.classList.toggle('no-scrollbar', hide)
    return () => document.documentElement.classList.remove('no-scrollbar')
  }, [route.page, consolePage])

  const drawerSections = [
    {
      label: t.menuVoterServices,
      items: [
        { icon: <UserPlus size={16} />, label: t.dsRegisterRoll, go: () => navigate('register') },
        { icon: <ListChecks size={16} />, label: t.dsTrackStatus, go: () => navigate('check') },
        { icon: <Download size={16} />, label: t.dsDownloadEpic, go: downloadCard },
        { icon: <Search size={16} />, label: t.dsSearchRoll, go: () => navigate('check') },
        { icon: <FileText size={16} />, label: t.dsFormsRegistration, go: () => navigate('register') },
        { icon: <MapPin size={16} />, label: t.dsPollingBooth, go: () => navigate(voter ? 'profile' : 'check') },
        { icon: <Bell size={16} />, label: t.dsRegisterComplaint, go: () => navigate('contact') },
        { icon: <ShieldCheck size={16} />, label: t.dsVoterEducation, go: () => navigate('help') },
      ],
    },
    {
      label: t.menuElectionInfo,
      items: [
        { icon: <Vote size={16} />, label: t.eiCurrentElections, go: () => navigate('elections') },
        { icon: <ScrollText size={16} />, label: t.eiPastElections, go: () => navigate('electionInfo') },
        { icon: <IdCard size={16} />, label: t.eiTermHouses, go: () => navigate('electionInfo') },
        { icon: <BarChart3 size={16} />, label: t.eiElectionResults, go: () => navigate('results') },
        { icon: <Database size={16} />, label: t.eiElectoralRoll, go: () => navigate('check') },
        { icon: <Gavel size={16} />, label: t.eiModelCode, go: () => navigate('electionInfo') },
      ],
    },
  ]

  const body = (
    <ErrorBoundary resetKey={`${page}/${id}`}>
      {view.element}
    </ErrorBoundary>
  )

  return (
    <AppContext.Provider value={context}>
      {voter && !view.site ? (
        <ConsoleLayout title={view.title} crumbs={view.crumbs} back={back}>
          {body}
        </ConsoleLayout>
      ) : (
        <PublicLayout drawerSections={drawerSections} back={back}>
          {view.site ? (
            body
          ) : (
            <div className="site-page">
              <h1 className="site-page-title">{view.title}</h1>
              {body}
            </div>
          )}
        </PublicLayout>
      )}

      {/* Shown only while still on the page it started from, so it leaves in the
          same render as the page change and Back mid-scene just drops it. */}
      {signInFrom === `${page}/${id}` && <SignInIntro onDone={() => navigate('login')} />}

      {toast && (
        <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
          {toast.tone === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{toast.message}</span>
          <button type="button" className="icon-btn" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  )
}

export default App
