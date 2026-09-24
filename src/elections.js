// Derived election logic: lifecycle status, eligibility, formatting and the
// tally. Everything here is pure — it reads the registry, the voter roll and
// the ledger, and never writes to any of them.

import { academicLine, departmentLabel, yearLabel } from './college'

export const STATUS_META = {
  draft: { label: 'Draft', tone: 'neutral' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  open: { label: 'Voting Open', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
}

export const METHOD_META = {
  single: { label: 'Single Choice', hint: 'Voters choose one candidate for each position.' },
  multiple: { label: 'Multiple Choice', hint: 'Voters choose up to the number of seats for each position.' },
  ranked: {
    label: 'Ranked Choice',
    hint: 'Voters rank candidates in order of preference. Counted by instant runoff.',
  },
}

export const MODE_META = {
  direct: { label: 'Direct Election', hint: 'Every eligible student votes directly.' },
  representative: {
    label: 'Representative Election',
    hint: 'Only elected committee representatives (year representatives and department leaders) vote.',
  },
}

export const SCOPE_META = {
  college: { label: 'College-wide', hint: 'Open to students from every department.' },
  department: { label: 'Department', hint: 'Open to students of one department.' },
  year: { label: 'Year-wise', hint: 'Open to one academic year of one department.' },
}

export function electionStatus(election, now = Date.now()) {
  if (!election.published) return 'draft'
  if (election.closedAt || now > Date.parse(election.endsAt)) return 'closed'
  if (now < Date.parse(election.startsAt)) return 'upcoming'
  return 'open'
}

export function resultsVisible(election, status) {
  if (status === 'draft' || status === 'upcoming') return false
  return election.resultsVisibility !== 'after_close' || status === 'closed'
}

// Scope pins the department (and year); the eligibility step can narrow the
// rest. Empty lists mean "no restriction".
export function effectiveEligibility(election) {
  const departments = election.eligibility?.departments || []
  const years = (election.eligibility?.years || []).map(Number)
  if (election.scope === 'year') return { departments: [election.departmentId], years: [Number(election.year)] }
  if (election.scope === 'department') return { departments: [election.departmentId], years }
  return { departments, years }
}

export function committeeVoterIds(committee) {
  const ids = new Set()
  if (!committee) return ids
  committee.council.forEach((entry) => entry.holder?.voterId && ids.add(entry.holder.voterId))
  Object.values(committee.departments).forEach((dept) => {
    if (dept.leader?.voterId) ids.add(dept.leader.voterId)
    Object.values(dept.years || {}).forEach((holder) => holder?.voterId && ids.add(holder.voterId))
  })
  return ids
}

export function isEligible(voter, election, committee) {
  if (!voter || voter.role === 'admin' || voter.status !== 'Verified') return false
  if (election.mode === 'representative') return committeeVoterIds(committee).has(voter.voterId)
  const { departments, years } = effectiveEligibility(election)
  if (departments.length && !departments.includes(voter.department)) return false
  if (years.length && !years.includes(Number(voter.year))) return false
  return true
}

export function registeredEligibleCount(election, voters, committee) {
  return voters.filter((voter) => isEligible(voter, election, committee)).length
}

// The official electorate when one is recorded, otherwise the registered
// students who meet the eligibility rules.
export function electorateOf(election, voters, committee) {
  return election.electorate || registeredEligibleCount(election, voters, committee)
}

export function scopeLabel(election) {
  if (election.scope === 'year') return academicLine(election.departmentId, election.year)
  if (election.scope === 'department') return departmentLabel(election.departmentId)
  return 'College-wide'
}

export function eligibilityLabel(election) {
  if (election.mode === 'representative') return 'Committee representatives'
  const { departments, years } = effectiveEligibility(election)
  const deptPart = departments.length ? departments.map(departmentLabel).join(', ') : ''
  const yearPart = years.length ? years.map(yearLabel).join(', ') : ''
  if (!deptPart && !yearPart) return 'All eligible students'
  return `${[deptPart, yearPart].filter(Boolean).join(' • ')} students`
}

// ------------------------------------------------------------ formatting ---

export function formatDate(iso, withYear = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export function formatPeriod(election) {
  return `${formatDate(election.startsAt)} – ${formatDate(election.endsAt)}`
}

export function relativeTime(iso, now = Date.now()) {
  const diff = now - Date.parse(iso)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso, true)
}

// When the student can expect to see results, in a few words.
export function resultsAvailability(election, status) {
  if (resultsVisible(election, status)) return status === 'closed' ? 'Final results published' : 'Live results'
  if (election.resultsVisibility === 'after_close') return `After voting closes on ${formatDate(election.endsAt)}`
  return `From ${formatDate(election.startsAt)}, live`
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

export function percentOf(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

// Returns the first problem with a ballot, or null when it can be cast.
// Positions without verified candidates are not on the ballot.
export function validateSelections(election, field, selections) {
  for (const position of election.positions) {
    const ids = new Set(field.filter((entry) => entry.positionId === position.id).map((entry) => entry.id))
    if (!ids.size) continue
    const picks = selections?.[position.id] || []
    if (!picks.length) return `Make a selection for ${position.title}.`
    if (picks.some((pick) => !ids.has(pick))) return `A selection for ${position.title} is not on the ballot.`
    if (new Set(picks).size !== picks.length) return `Each candidate can be chosen only once for ${position.title}.`
    if (election.method === 'single' && picks.length !== 1) return `Choose exactly one candidate for ${position.title}.`
    if (election.method === 'multiple' && picks.length > (position.seats || 1)) {
      return `Choose at most ${position.seats} candidates for ${position.title}.`
    }
  }
  return null
}

// ----------------------------------------------------------------- tally ---

// Ledger ballots for one election, each as { positionId: [candidateIds] }.
// Ballots from before per-election voting hold a single candidateId.
export function electionBallots(election, chain) {
  return chain
    .filter((block) => block.type === 'ballot')
    .filter((block) => (election.legacy ? !block.electionId : block.electionId === election.id))
    .map((block) =>
      election.legacy ? { [election.positions[0].id]: [block.candidateId] } : block.selections || {},
    )
}

function baseTurnoutOf(election) {
  if (election.baseBallots) return election.baseBallots.reduce((sum, ballot) => sum + ballot.weight, 0)
  return election.baseTurnout || 0
}

export function votesCast(election, chain) {
  return baseTurnoutOf(election) + electionBallots(election, chain).length
}

// Instant runoff: count first preferences among the remaining candidates,
// drop the lowest until someone holds a majority of the active ballots.
function instantRunoff(ballots, candidateIds) {
  const remaining = new Set(candidateIds)
  const rounds = []
  for (;;) {
    const counts = Object.fromEntries([...remaining].map((id) => [id, 0]))
    let active = 0
    ballots.forEach((ballot) => {
      const top = ballot.ranking.find((id) => remaining.has(id))
      if (!top) return
      counts[top] += ballot.weight
      active += ballot.weight
    })
    const round = { counts, active, eliminated: null }
    rounds.push(round)
    const ordered = [...remaining].sort((a, b) => counts[b] - counts[a])
    if (remaining.size <= 1 || active === 0) break
    if (counts[ordered[0]] * 2 > active) break
    const lowest = ordered[ordered.length - 1]
    if (counts[lowest] === counts[ordered[0]]) break
    round.eliminated = lowest
    remaining.delete(lowest)
  }
  return rounds
}

// Results for every position of an election. `candidates` should be the
// election's verified candidates.
export function tallyElection(election, candidates, chain, status) {
  const ballots = electionBallots(election, chain)
  const closed = status === 'closed'

  const positions = election.positions.map((position) => {
    const field = candidates.filter((entry) => entry.positionId === position.id)
    const ids = field.map((entry) => entry.id)
    const seats = election.method === 'multiple' ? position.seats || 1 : 1

    if (election.method === 'ranked') {
      const weighted = [
        ...(election.baseBallots || []).map((ballot) => ({ ranking: ballot.ranking, weight: ballot.weight })),
        ...ballots.map((ballot) => ({ ranking: ballot[position.id] || [], weight: 1 })),
      ].filter((ballot) => ballot.ranking.length)
      const rounds = instantRunoff(weighted, ids)
      const first = rounds[0]
      const last = rounds[rounds.length - 1]
      const eliminatedIn = {}
      rounds.forEach((round, index) => {
        if (round.eliminated) eliminatedIn[round.eliminated] = index + 1
      })
      const rows = field
        .map((entry) => ({
          candidate: entry,
          votes: last.counts[entry.id] || 0,
          firstPreferences: first?.counts[entry.id] || 0,
          eliminatedInRound: eliminatedIn[entry.id] || null,
        }))
        .map((row) => ({ ...row, percent: percentOf(row.votes, last.active) }))
        .sort((a, b) => b.votes - a.votes || b.firstPreferences - a.firstPreferences)
      return finishPosition(position, rows, weighted.reduce((sum, b) => sum + b.weight, 0), seats, closed, rounds)
    }

    const counts = Object.fromEntries(field.map((entry) => [entry.id, entry.baseVotes || 0]))
    let valid = baseTurnoutOf(election)
    ballots.forEach((ballot) => {
      const picks = (ballot[position.id] || []).filter((id) => id in counts)
      if (!picks.length) return
      valid += 1
      picks.forEach((id) => {
        counts[id] += 1
      })
    })
    const rows = field
      .map((entry) => ({ candidate: entry, votes: counts[entry.id], percent: percentOf(counts[entry.id], valid) }))
      .sort((a, b) => b.votes - a.votes)
    return finishPosition(position, rows, valid, seats, closed, null)
  })

  return { votesCast: votesCast(election, chain), positions }
}

function finishPosition(position, rows, validVotes, seats, closed, rounds) {
  const marked = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    winning: index < seats && row.votes > 0,
    elected: closed && index < seats && row.votes > 0,
  }))
  return { position, seats, validVotes, rows: marked, rounds }
}
