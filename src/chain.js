// Hash-linked ballot ledger.
//
// Every accepted ballot becomes a block whose hash commits to the previous
// block, so any edit to an older vote invalidates every block after it.
// The voter identifier is never stored: only a salted digest of it is, which
// is enough to prove "one ballot per voter" without revealing who voted.

const CHAIN_KEY = 'evoting_ledger_chain'
const VOTER_SALT = 'ballotledger::v1::voter'
const DIFFICULTY = '00'
const GENESIS_PREVIOUS = '0'.repeat(64)

// Ballots written before per-election voting carry no electionId; they all
// belong to the original election, which keeps this id in the registry.
export const LEGACY_ELECTION_ID = 'general'

// Non-cryptographic digest used only when Web Crypto is unavailable
// (for example a plain-http preview host, where crypto.subtle is undefined).
function fallbackHash(input) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0
    h2 = Math.imul(h2 + code + i, 0x85ebca6b) >>> 0
  }
  let out = ''
  for (let round = 0; round < 8; round += 1) {
    h1 = Math.imul(h1 ^ (h2 >>> 7), 0x2545f491) >>> 0
    h2 = Math.imul(h2 ^ (h1 >>> 11), 0x9e3779b1) >>> 0
    out += (h1 ^ h2).toString(16).padStart(8, '0')
  }
  return out.slice(0, 64)
}

export async function sha256(input) {
  try {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const bytes = new TextEncoder().encode(input)
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch (err) {
    console.warn('Web Crypto unavailable, using fallback digest:', err)
  }
  return fallbackHash(input)
}

// Per-election digests are salted with the election id as well, so ballots
// from one voter in two elections cannot be linked to each other.
export async function hashVoterId(voterId, electionId) {
  const id = String(voterId).trim().toUpperCase()
  return sha256(electionId ? `${VOTER_SALT}::${electionId}::${id}` : `${VOTER_SALT}::${id}`)
}

export function serializeSelections(selections = {}) {
  return Object.keys(selections)
    .sort()
    .map((key) => `${key}=${(selections[key] || []).join(',')}`)
    .join(';')
}

function blockPayload(block) {
  const fields = [
    block.index,
    block.timestamp,
    block.type,
    block.voterHash,
    block.candidateId ?? 'none',
    block.previousHash,
    block.nonce,
  ]
  // Only per-election ballots commit to these, so older blocks still verify.
  if (block.electionId) fields.push(block.electionId, serializeSelections(block.selections))
  return fields.join('|')
}

// Proof-of-work: search for a nonce whose digest carries the difficulty prefix.
async function mine(block) {
  let nonce = 0
  for (;;) {
    const candidate = { ...block, nonce }
    const hash = await sha256(blockPayload(candidate))
    if (hash.startsWith(DIFFICULTY)) {
      return { ...candidate, hash }
    }
    nonce += 1
  }
}

export function loadChain() {
  try {
    const raw = localStorage.getItem(CHAIN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to read ledger:', err)
    return []
  }
}

function saveChain(chain) {
  try {
    localStorage.setItem(CHAIN_KEY, JSON.stringify(chain))
  } catch (err) {
    console.error('Failed to persist ledger:', err)
  }
}

export async function ensureGenesis() {
  const chain = loadChain()
  if (chain.length > 0) return chain

  const genesis = await mine({
    index: 0,
    timestamp: new Date().toISOString(),
    type: 'genesis',
    voterHash: GENESIS_PREVIOUS,
    candidateId: null,
    previousHash: GENESIS_PREVIOUS,
  })
  const started = [genesis]
  saveChain(started)
  return started
}

export async function hasVoterHashVoted(voterId) {
  const voterHash = await hashVoterId(voterId)
  return loadChain().some((block) => block.type === 'ballot' && block.voterHash === voterHash)
}

export async function addBallotBlock(voterId, candidateId) {
  const chain = await ensureGenesis()
  const voterHash = await hashVoterId(voterId)

  if (chain.some((block) => block.type === 'ballot' && block.voterHash === voterHash)) {
    throw new Error('A ballot for this voter is already sealed on the ledger.')
  }

  const previous = chain[chain.length - 1]
  const block = await mine({
    index: chain.length,
    timestamp: new Date().toISOString(),
    type: 'ballot',
    voterHash,
    candidateId,
    previousHash: previous.hash,
  })

  const next = [...chain, block]
  saveChain(next)
  return { block, chain: next }
}

// A ballot for one election: `selections` maps each position id to the
// chosen candidate ids (in preference order for ranked ballots).
export async function addElectionBallot(voterId, electionId, selections) {
  const chain = await ensureGenesis()
  const voterHash = await hashVoterId(voterId, electionId)

  if (chain.some((block) => block.type === 'ballot' && block.electionId === electionId && block.voterHash === voterHash)) {
    throw new Error('A ballot for this voter is already sealed for this election.')
  }

  const previous = chain[chain.length - 1]
  const block = await mine({
    index: chain.length,
    timestamp: new Date().toISOString(),
    type: 'ballot',
    voterHash,
    candidateId: null,
    electionId,
    selections,
    previousHash: previous.hash,
  })

  const next = [...chain, block]
  saveChain(next)
  return { block, chain: next }
}

// Builds a demo ledger from scratch: a genesis block at `genesisAt`, then one
// mined block per entry, oldest first. Entries for the legacy election carry
// a candidateId; the rest carry per-election selections.
export async function seedLedger(entries, genesisAt) {
  const genesis = await mine({
    index: 0,
    timestamp: genesisAt,
    type: 'genesis',
    voterHash: GENESIS_PREVIOUS,
    candidateId: null,
    previousHash: GENESIS_PREVIOUS,
  })
  const chain = [genesis]
  const ordered = [...entries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  for (const entry of ordered) {
    const legacy = entry.electionId === LEGACY_ELECTION_ID
    const block = await mine({
      index: chain.length,
      timestamp: entry.at,
      type: 'ballot',
      voterHash: await hashVoterId(entry.voterId, legacy ? undefined : entry.electionId),
      candidateId: legacy ? entry.candidateId : null,
      ...(legacy ? {} : { electionId: entry.electionId, selections: entry.selections }),
      previousHash: chain[chain.length - 1].hash,
    })
    chain.push(block)
  }
  saveChain(chain)
  return chain
}

export function ballotElectionId(block) {
  return block.electionId || LEGACY_ELECTION_ID
}

// Recompute every digest and re-check every link.
export async function verifyChain(chain = loadChain()) {
  if (chain.length === 0) return { valid: true, blocks: 0, brokenAt: null }

  let previousHash = GENESIS_PREVIOUS
  for (let i = 0; i < chain.length; i += 1) {
    const block = chain[i]
    if (block.index !== i || block.previousHash !== previousHash) {
      return { valid: false, blocks: chain.length, brokenAt: i }
    }
    const recomputed = await sha256(blockPayload(block))
    if (recomputed !== block.hash) {
      return { valid: false, blocks: chain.length, brokenAt: i }
    }
    previousHash = block.hash
  }
  return { valid: true, blocks: chain.length, brokenAt: null }
}

export function tallyChain(chain = loadChain()) {
  const counts = {}
  chain.forEach((block) => {
    if (block.type !== 'ballot' || !block.candidateId) return
    counts[block.candidateId] = (counts[block.candidateId] || 0) + 1
  })
  return counts
}

export function ballotCount(chain = loadChain()) {
  return chain.filter((block) => block.type === 'ballot').length
}

export function findBallotByVoterHash(voterHash, chain = loadChain(), electionId = null) {
  return (
    chain.find(
      (block) =>
        block.type === 'ballot' && block.voterHash === voterHash && (block.electionId || null) === electionId,
    ) || null
  )
}

export function resetChain() {
  try {
    localStorage.removeItem(CHAIN_KEY)
  } catch (err) {
    console.error('Failed to reset ledger:', err)
  }
  return []
}

export function shortHash(hash, size = 10) {
  if (!hash) return '—'
  return `${hash.slice(0, size)}…${hash.slice(-4)}`
}

// "8F4A...91BC": the compact form used in lists and cards.
export function compactHash(hash) {
  if (!hash) return '—'
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`.toUpperCase()
}
