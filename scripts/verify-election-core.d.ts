export function countVoteEvents(
  logs: readonly { args: { candidateId?: bigint | number | string } }[],
  candidateCount: number,
): bigint[]