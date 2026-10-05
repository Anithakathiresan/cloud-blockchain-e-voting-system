import { pathToFileURL } from 'node:url'
import { createPublicClient, defineChain, http, keccak256, parseAbi, type Address } from 'viem'
import { countVoteEvents } from './verify-election-core.js'

const voteEventAbi = parseAbi(['event VoteCast(uint256 indexed electionId, uint256 indexed candidateId)'])
const readAbi = parseAbi([
  'function getElectionStatus(uint256 electionId) view returns (uint8)',
  'function getCandidates(uint256 electionId) view returns ((uint256 id, string name, string metadataURI)[] result)',
  'function getResults(uint256 electionId) view returns (uint256 totalVotes, uint64 finalizedAt, (uint256 id, string name, string metadataURI, uint256 voteCount)[] result)',
])

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index < 0 ? undefined : process.argv[index + 1]
}

function required(name: string, environmentName: string) {
  const value = argument(name) || process.env[environmentName]
  if (!value) throw new Error(`Missing --${name} (or ${environmentName})`)
  return value
}

function asSafeInteger(value: string, label: string) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative safe integer`)
  return parsed
}

async function verifyElection() {
  if (process.argv.includes('--help')) {
     console.log('Set RPC_URL, CONTRACT_ADDRESS, CHAIN_ID, ELECTION_ID, and FROM_BLOCK, then run: npm run verify-election')
    return
  }

  const rpcUrl = required('rpc-url', 'RPC_URL')
  const contractAddress = required('contract', 'CONTRACT_ADDRESS') as Address
  const chainId = asSafeInteger(required('chain-id', 'CHAIN_ID'), 'chain-id')
  const electionId = BigInt(required('election-id', 'ELECTION_ID'))
  const fromBlock = BigInt(required('from-block', 'FROM_BLOCK'))
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) throw new Error('contract must be a 20-byte EVM address')
  if (electionId < 0n || fromBlock < 0n) throw new Error('election-id and from-block must be non-negative')

  const chain = defineChain({
    id: chainId,
    name: `Configured EVM chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  })
  const client = createPublicClient({ chain, transport: http(rpcUrl) })
  const actualChainId = await client.getChainId()
  if (actualChainId !== chainId) throw new Error(`RPC chain mismatch: expected ${chainId}, received ${actualChainId}`)

  const address = contractAddress as Address
  const bytecode = await client.getBytecode({ address })
  if (!bytecode || bytecode === '0x') throw new Error('No contract bytecode exists at the configured address')
  const latestBlock = await client.getBlockNumber()
  if (fromBlock > latestBlock) throw new Error('from-block is later than the current chain head')

  const status = await client.readContract({ address, abi: readAbi, functionName: 'getElectionStatus', args: [electionId] })
  if (status !== 5) throw new Error(`Election must be Finalized (status 5); received status ${status}`)
  const candidates = await client.readContract({ address, abi: readAbi, functionName: 'getCandidates', args: [electionId] })
  const [reportedTotal, finalizedAt, reportedCandidates] = await client.readContract({
    address,
    abi: readAbi,
    functionName: 'getResults',
    args: [electionId],
  })

  const candidateCounts = countVoteEvents([], candidates.length)
  const chunkSize = 2_000n
  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = start + chunkSize - 1n < latestBlock ? start + chunkSize - 1n : latestBlock
    const logs = await client.getLogs({
      address,
      event: voteEventAbi[0],
      args: { electionId },
      fromBlock: start,
      toBlock: end,
    })
    const partialCounts = countVoteEvents(logs, candidates.length)
    for (let index = 0; index < candidateCounts.length; index += 1) candidateCounts[index] += partialCounts[index]
  }

  const eventTotal = candidateCounts.reduce((total, count) => total + count, 0n)
  const resultCounts = new Map(reportedCandidates.map((candidate) => [candidate.id, candidate.voteCount]))
  const candidateCountsMatch = candidates.every((candidate, index) => resultCounts.get(candidate.id) === candidateCounts[index])
  const resultMatches = candidateCountsMatch && eventTotal === reportedTotal && reportedCandidates.length === candidates.length

  const report = {
    verificationType: 'LEGACY_PUBLIC_VOTE_EVENT_RECOUNT',
    privacyWarning: 'This contract publishes candidate IDs in VoteCast logs; this recount does not provide ballot secrecy.',
    chainId,
    contractAddress: address,
    runtimeCodeHash: keccak256(bytecode),
    electionId: electionId.toString(),
    status: 'Finalized',
    scannedFromBlock: fromBlock.toString(),
    scannedToBlock: latestBlock.toString(),
    finalizedAt: finalizedAt.toString(),
    eventBallotCount: eventTotal.toString(),
    contractReportedTotal: reportedTotal.toString(),
    candidateCountsMatch,
    resultMatches,
    candidates: candidates.map((candidate, index) => ({
      id: candidate.id.toString(),
      name: candidate.name,
      recountedVotes: candidateCounts[index].toString(),
      contractReportedVotes: (resultCounts.get(candidate.id) ?? 0n).toString(),
    })),
    limitation: 'Event recount trusts the selected RPC, deployed runtime and contract event semantics; verify source/build and chain independently.',
  }
  console.log(JSON.stringify(report, null, 2))
  if (!resultMatches) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyElection().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Verification failed')
    process.exitCode = 1
  })
}