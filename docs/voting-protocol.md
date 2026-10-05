# Voting Protocol: Current and Target Boundary

## Current implemented protocol

1. The owner configures an election, appends candidates, assigns eligible EVM addresses and schedules a future time range.
2. The owner starts the scheduled election at or after its start time and before end.
3. An eligible wallet calls `castVote(electionId, candidateId)` during Active.
4. Contract checks lifecycle, time, eligibility, one-vote flag and candidate index; sets the flag; increments candidate and total counts; emits `VoteCast`.
5. After the scheduled end, any account can end and then finalize. The result getter is available only in Finalized.

This is a **public direct-vote protocol**. Sender and candidate ID are visible. Per-wallet uniqueness is not anonymous uniqueness. Results are not cryptographically hidden before finalization.

## Not implemented

No commit-reveal, encrypted ballot, threshold decryption, anonymous credential, ZK proof, Merkle eligibility proof, election-specific nullifier, receipt-freeness or coercion resistance exists. Do not describe this implementation as private voting.

## Future protocol design gate

Before replacing direct voting, specify ballot format, proof statement, election domain separation, nullifier derivation, root update/freeze rules, verifier implementation, tally semantics, invalid-proof behavior, key setup/trust, result reconstruction and coercion limitations. Use an established protocol and its current audited implementation; do not derive a custom hash/nullifier or circuit ad hoc. A replacement contract requires a new deployment and migration policy.
