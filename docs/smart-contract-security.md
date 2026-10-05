# Smart-Contract Security

This file is a current implementation pointer and control summary. It is not an audit; see `security-audit.md` and `smart-contract-security-review.md`.

## Implemented `VotingSystem` controls

- Solidity `^0.8.24`, compiled in the configured Hardhat profile with solc 0.8.28 and optimizer enabled (200 runs).
- OpenZeppelin Contracts 5 `Ownable`; the deployer is the initial and only owner.
- Six explicit states: Draft, Scheduled, Active, Paused, Ended, Finalized.
- Contract-side schedule and voting-window checks; one accepted vote per eligible caller address/election.
- Candidate index validation; candidate and eligibility updates restricted to Draft/Scheduled.
- Vote counters increment only through accepted `castVote`; results getter is Finalized-gated.
- `castVote` makes no external calls; no proxy, delegatecall or upgrade mechanism is present.

## Known contract risks

- Candidate ID and sender are public in calldata/event. This contract is unsuitable for secret ballots.
- Owner governance is a single key; no multisig/timelock exists.
- Eligibility is wallet allowlisting, not identity proof, Sybil resistance, or anonymous group membership.
- Candidate arrays and strings have no explicit size/count bound; getters return full arrays.
- No canonical election configuration hash or metadata CID commitment exists.
- No Semaphore, MACI, ZK verifier, encrypted ballot, nullifier, or proof replay protection exists.
- The contract is immutable. Fixes require a new deployment and documented migration/cutover.

## Validation status

The current unit test file contains 11 scenario tests. It does not establish all invariants, cover arbitrary fuzz input, test malicious RPC/frontend behavior, or replace independent review. `security-analysis.md` lists tooling status. **Independent third-party security audit: NOT PERFORMED.**
