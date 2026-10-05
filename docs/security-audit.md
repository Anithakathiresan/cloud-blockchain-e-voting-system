# Security Audit Status

## Internal review

An internal source-level review is recorded in:

- `current-state-analysis.md`
- `production-gap-analysis.md`
- `threat-model.md`
- `smart-contract-security-review.md`
- `security-analysis.md`
- `security-invariants.md`

The current Hardhat suite has 17 tests: 11 legacy contract scenarios plus deployment-guard, event-recount helper, and active-frontend fail-closed regression checks. TypeScript and frontend build checks are separate. These are limited engineering checks, not a complete security assessment or privacy proof.

**Independent third-party security audit: NOT PERFORMED.**

## Important unresolved findings

- Ballot candidate ID is public in transaction calldata and the `VoteCast` event; voter wallet and choice are directly linkable.
- Eligibility is a public wallet allowlist; no anonymous membership proof or election nullifier exists.
- One OpenZeppelin `Ownable` address controls administrative setup and start/pause/resume.
- No contract static analysis, fuzzing/invariant suite, formal verification, wallet E2E, reorganization/finality test, penetration assessment or accessibility audit is evidenced.
- The active frontend currently has configured RPC fallback and chain-ID checks, but does not verify runtime bytecode/source identity, use an independent provider quorum, or implement canonical-chain finality.
- The dormant legacy JSX prototype remains in the repository and contains insecure localStorage credentials plus plaintext simulated ballot choices; it is not the active entry.
- The public contract's Sepolia deployment path is guarded, but this does not change or disable already deployed copies or direct contract calls.

## Audit scope if commissioned

An independent review should include protocol/privacy design, proof circuits and trusted setup if selected, Solidity source and deployed bytecode, access/governance/key custody, RPC/frontend supply chain, wallet UX/phishing, result reconstruction, gas/DoS limits, recovery, and operational election procedures. The auditor should independently build from a pinned commit and verify deployment metadata. No claim of audit completion should be made until a signed report and remediation record exist.
