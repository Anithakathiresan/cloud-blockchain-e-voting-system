export function countVoteEvents(logs, candidateCount) {
  const counts = Array.from({ length: candidateCount }, () => 0n)
  for (const log of logs) {
    if (log.args.candidateId === undefined) throw new Error('VoteCast event is missing candidate ID')
    const candidateId = BigInt(log.args.candidateId)
    if (candidateId < 0n || candidateId >= BigInt(candidateCount)) {
      throw new Error(`VoteCast event contains invalid candidate ID ${candidateId}`)
    }
    counts[Number(candidateId)] += 1n
  }
  return counts
}