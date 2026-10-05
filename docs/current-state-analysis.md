# Current-State Analysis

**Review scope:** repository state inspected on 2026-09-27. This document describes the code that exists, not a target design. It is a source review, not an independent security audit. No application or contract code was changed for this Phase 0 review.

## 1. Existing architecture

There are two distinct frontend implementations in the repository:

- The active page entry in [`index.html`](../index.html) loads [`src/dapp/main.tsx`](../src/dapp/main.tsx), which mounts the TypeScript dApp, wagmi wallet provider, TanStack Query, and [`src/dapp/App.tsx`](../src/dapp/App.tsx).
- The older JSX prototype is now isolated under [`legacy/`](../legacy/README.md); its prior entry was `legacy/src/main.jsx` and it imported the localStorage voter database, local election registry, and simulated proof-of-work-like ledger. It is not imported by the active HTML entry.
- The active dApp talks directly to a configured EVM JSON-RPC client for reads and uses the wallet connector for signed writes. There is no Express server or project REST API in this path.
- [`blockchain/contracts/VotingSystem.sol`](../blockchain/contracts/VotingSystem.sol) is the current on-chain election/vote contract. It is a single contract, not a set of modular election, eligibility, and ballot contracts.
- Hardhat is configured in [`hardhat.config.js`](../hardhat.config.js). Deploy and demo scripts are under [`blockchain/scripts/`](../blockchain/scripts/); contract tests are in [`blockchain/test/VotingSystem.js`](../blockchain/test/VotingSystem.js).

No indexer is configured. The frontend directly enumerates election IDs from `nextElectionId` and reads each election and candidate list from the RPC. The audit tab requests logs from only the latest 10,000 blocks.

## 2. Existing technologies and configuration

- React, React DOM, Vite, TypeScript (strict for `src/dapp`), wagmi, viem, TanStack Query, Lucide, Hardhat 3, Ethers through the Hardhat toolbox, Solidity 0.8.28 compiler profile, and OpenZeppelin Contracts 5 `Ownable`.
- Dependency declarations for Vite, React, and the React Vite plugin use `latest`; the lockfile pins the resolved install but a fresh dependency resolution is not a stable version policy.
- Vite uses `base: './'` for relative static assets. It imports Google Fonts from the active CSS; no CSP or security-header policy is provided by this repository.
- `.env.example` documents browser-safe `VITE_*` values and deployment-only Sepolia variables. Hardhat loads ignored `.env.local` using dotenv. A local `.env.local` and deployment manifest existed during review but are ignored and are not portable repository configuration.
- The local Hardhat demo was observed in prior validation at chain ID `31337`; its state and address are ephemeral and must not be treated as a durable deployment record. No committed Sepolia deployment manifest/address exists.

## 3. Existing workflows

### Active frontend

1. Connect an injected wallet.
2. Request a message signature containing address, chain ID, and a generated random nonce.
3. Recover the signer locally and keep the address in in-memory component state.
4. Read contract owner, election, candidates, voter eligibility, and voted status through a single configured public RPC client.
5. The recognized contract owner can create drafts, add candidates, set wallet eligibility, schedule, start, pause/resume, end, and finalize through wallet transactions.
6. A voter selects one candidate, reviews an explicit confirmation dialog, and sends `castVote`.
7. The UI awaits a transaction receipt, then invalidates query data. The current UI transaction state is pending/confirmed/failed/rejected; it does not implement a multi-confirmation or chain-finality state.
8. Finalized results are read via `getResults`. The audit tab renders recent event names, block numbers, and transaction hashes, but not a complete independently verified election history.

The signature is not sent to a server, does not grant contract rights, and is not needed by the contract. It is a local UI gate only. Its nonce has no server-side consumption or replay check, no expiration, and no explicit origin/application domain field. A reload clears the in-memory authenticated state.

### Local deployment

`npm run contracts:node` starts a local chain; `npm run contracts:deploy:local` deploys and writes an ignored JSON manifest; `npm run contracts:demo` seeds a labeled demo election and three eligible local wallets. The demo script refuses non-31337 chains. Hardhat's printed test account private keys are deliberately public development keys and must never be used on public networks.

## 4. Existing smart contract

The contract inherits OpenZeppelin `Ownable`; the deployer is the one initial owner. It stores election names/metadata URI, schedule, state, candidate data/counts, eligible wallet flags, per-election per-wallet voted flags, and total ballots.

The enum is `Draft`, `Scheduled`, `Active`, `Paused`, `Ended`, `Finalized`. Important operations:

- Owner-only: create, schedule, add candidate, change eligibility, start, pause, resume.
- Permissionless after contract checks: end after `endsAt`, finalize after `Ended`.
- Vote: caller must be active, within `[startsAt, endsAt)`, eligible, not previously voted for that election, and select an existing candidate.
- Candidate and eligibility changes are blocked outside Draft/Scheduled. A vote increments a candidate count and total count in one transaction.
- `getResults` reverts until Finalized. The returned results are stored on-chain counters, not a manually entered tally.
- Election and candidate arrays are returned in full. Candidate loops are bounded only by the number an owner adds; there is no explicit maximum.

The contract has no proxy or upgrade mechanism. It also has no configuration hash, candidate-set commitment, eligibility root, ZK verifier, nullifier, encrypted/committed ballot, multisig, timelock, or formal protocol version.

## 5. Existing security controls

Controls verified in code:

- OpenZeppelin owner checks on administrative setup and start/pause/resume.
- State and timestamp checks within the contract, not only the frontend.
- Atomic duplicate vote prevention for one wallet address per election.
- Candidate index bounds check and zero-address eligibility rejection.
- Candidate and eligibility configuration freeze after election leaves Draft/Scheduled.
- Permissionless end/finalize are state/time-gated; there is no admin setter for vote counts.
- Frontend checks configured chain, contract address syntax, wallet chain, and owner address for UX. The contract remains the authorization boundary.
- Explicit ballot confirmation, human-oriented transaction errors, no private key input, and no frontend persistence of the selected vote in the active implementation.
- Secret-bearing deployment settings are not prefixed with `VITE_` in the example file; `.env.local` is ignored.
- Contract tests cover 11 basic lifecycle/access/vote cases. Prior recorded checks passed `npm run contracts:test`, `npm run typecheck`, `npm run build`, and production-only npm audit. The build reports a >500 kB minified JavaScript chunk.

These controls do not amount to an independent audit, formal verification, a production identity policy, or reliable ballot secrecy.

## 6. Existing privacy controls and exposure

The active UI avoids displaying a candidate choice again after ballot submission and says public-chain votes are not anonymous. This is a UI disclosure, not a privacy mechanism.

The contract call is `castVote(electionId, candidateId)`, and `VoteCast` indexes both values. Transaction sender and calldata are public. An observer can directly link wallet to election and candidate. Eligibility updates are transactions whose calldata contains the eligible wallet address. Solidity `private` mappings only suppress generated getters; storage remains inspectable. The eligibility event's hashed commitment does not conceal the address in the transaction input.

No personal name, email, phone number, or government identifier is part of the active contract schema. Metadata strings are public and may themselves leak information if operators put sensitive data in them.

The active frontend RPC provider can observe request metadata (network, timing, IP address at the transport layer, and queried contract). A browser wallet and device can also reveal account and transaction activity. No privacy-preserving RPC transport or anonymous voting proof is included.

## 7. Existing limitations

- Ballot secrecy, anonymity, coercion resistance, receipt-freeness, and hidden live results are absent.
- One address represents eligibility; it neither proves one real person per wallet nor prevents one person obtaining several eligible wallets.
- One owner key is an operational single point of control. No multisig threshold, governance delay, second-party approval, or key recovery exists.
- No frontend wallet-driven automated tests or full end-to-end tests are present. Browser reads were exercised, but MetaMask signing/submission was not part of the recorded automated validation.
- The frontend's election reads trust one RPC endpoint and configured address; no fallback, chain code identity check, expected runtime bytecode hash, or independent deployment metadata validation is present.
- The frontend marks a transaction confirmed after one receipt; it does not distinguish confirmations from finalized chain state or handle a later reorganization.
- The audit tab is a bounded recent-log view, not a complete event index, actor/action/time/election audit record, or tamper-detection tool. Some emitted events do not include actor explicitly (transaction sender is recoverable from the transaction).
- There is no independent recount script, read-only arbitrary-contract verification tool, deployment verification command, CI, lint command, secret scan, contract static-analysis report, fuzz/invariant suite, accessibility automation, monitoring implementation, or disaster-recovery runbook.
- Metadata URIs are arbitrary strings. CID format/content is not validated, pinning is not checked, and there is no multi-gateway fallback.
- Admin control cannot be transferred via a dedicated UI workflow, though inherited Ownable functions exist in the contract ABI. Upgradeability is absent, intentionally avoiding proxy upgrade risk, but no migration process exists.
- No Sepolia deployment was found in committed sources/configuration; deployment must be operator-run. This repository review did not query a public chain.

## 8. Existing technical debt

- Dormant JSX prototype and active TypeScript dApp coexist, with overlapping product language and materially different trust/security semantics. The inactive prototype is still reachable by changing the HTML entry or imports.
- The old prototype seeds names, voter IDs, emails, DOB-derived passwords and a hardcoded admin credential; it persists these records in browser localStorage. It also makes roles client-side and stores its simulated ledger/ballots locally. This is not the active dApp, but it is a severe accidental reactivation risk and source of misleading legacy documentation.
- The old simulated ledger uses a fixed public salt and a custom fallback digest that is not cryptographic. Its proof-of-work prefix is not a consensus or security boundary.
- The active UI ABI is hand-maintained separately from the generated artifact. Drift can cause wrong reads/calls or misleading errors.
- The active app is a large single component; input, provider failure, transaction states, data validation, audit, navigation and governance concerns are concentrated in it.
- `latest` dependency ranges reduce reproducibility across lockfile regeneration, while no Node/npm toolchain file or CI build attestation exists.
- Documentation currently captures the non-anonymity boundary but does not yet contain a threat model, complete security matrix, recovery plan, gas evidence, or deployment/code provenance.

## 9. Vulnerabilities and material risks observed

Severity here is product-contextual. A privacy leak is Critical for any requirement that ballots remain secret; the same behavior may be acceptable only for a deliberately public poll.

1. **Critical for secret elections: direct wallet-to-choice leakage.** Public `castVote` calldata and `VoteCast` reveal the candidate ID.
2. **Critical for production governance: single owner key.** One compromised or colluding owner can create elections, decide eligibility, control setup and pause/resume, and choose when to start. It cannot arbitrarily rewrite already accepted counts, but can influence the election perimeter and timing.
3. **High: public wallet eligibility list.** Setup transactions reveal who is eligible and can correlate addresses with identity known elsewhere.
4. **High: voter identity and duplicate protection are wallet-based only.** Sybil resistance depends entirely on the off-chain authority choosing eligible wallets; the contract has no anonymous membership proof or personhood guarantee.
5. **High: single RPC/configured address trust and availability.** Stale, malicious, misconfigured, unavailable or wrong-chain reads can mislead or block the UI; writes are still wallet-to-contract but use the selected contract/address/network.
6. **High: deployment identity is not pinned.** Syntax-valid address and chain ID are not enough to prove that the address contains the expected source/version. No runtime code hash is checked in the UI.
7. **High: no reorganization/finality handling.** A single receipt is displayed as confirmed; the UI has no confirmation threshold or rollback/reconciliation state.
8. **Medium: unbounded full-array reads and audit range.** Very large election/candidate counts can hit RPC response or gas limits; audit history can silently omit older activity.
9. **Medium: admin pause policy is underspecified.** Pause is owner-controlled and emitted, but no reason, duration bound, approval threshold, voting-time extension, or operator process exists.
10. **Medium: no front-end automated security/accessibility/E2E tests or static contract analysis.** Existing Solidity tests establish selected properties only.
11. **Medium: metadata integrity/availability is not enforced.** URI strings may be mutable URLs, malformed values, unavailable CIDs, or misleading content.
12. **High if dormant prototype is reactivated: plaintext passwords, DOB-derived credentials, seeded admin secret, localStorage role authorization, and simulated local ledger.** These are not used by the active entry but must not be confused with safe fallback functionality.

No evidence was found in the current contract of external calls in vote counting, unchecked arithmetic, delegatecall, proxy storage collision, or a reentrancy path. Absence of those patterns is not a general security certification.

## 10. Missing functionality against the target

Not implemented: multisig/timelock governance; ZK membership/Semaphore; Merkle eligibility root; election-specific nullifier; encrypted ballots; protocol configuration hash; independent recount/verification route; arbitrary address/network read-only verifier; RPC failover; reorg/finality workflow; transaction estimate/timeout/replacement state; contract source/version verification; deployment provenance; complete actor/time audit UI; IPFS pinning/CID validation/gateway fallback; voter identity issuance/recovery process; indexer reconciliation; CI; lint; secret detection; Slither/Mythril/Solhint; fuzzing/invariants; frontend/E2E/accessibility tests; gas measurements; monitoring; disaster recovery; separate staging/production environments; and production readiness boundary/report.

## 11. Migration risks

- The old prototype is not an authoritative source. Do not migrate its local election state, fake votes, credentials, sessions, or voter IDs into the contract.
- The current contract is immutable once deployed. A privacy redesign or governance change requires a new contract, a new address, a documented election migration/cutover policy, and explicit handling of in-progress elections. There is no safe in-place patch.
- Replacing wallet allowlists with anonymous proofs changes eligibility issuance, user onboarding, revocation, nullifier semantics, events, contract storage, testing and recovery. A proof system must be selected and reviewed before implementation; hashing alone is not a substitute.
- Adding multisig changes the owner address and operator workflow. The current UI checks exactly `owner()` and has no multisig proposal/execute interface; a Safe or timelock needs compatible UI integration and testnet verification.
- ABI changes require synchronized contract artifact, typed frontend ABI, deployment manifest, and tests. Old addresses will not implement new selectors.
- Testnet and local deployments have different account, RPC, explorer, finality and key risks. A local deployment manifest is ephemeral and not portable.
- Cleaning dormant prototype code may remove screens useful for requirements, but retaining it can mislead reviewers or accidentally reintroduce unsafe code. Quarantine/archival should precede removal and preserve any required academic UI intentionally.

## Source-of-truth map

| Information | Current source of truth | Notes |
| --- | --- | --- |
| Active election/candidate/lifecycle/tally state | Deployed `VotingSystem` contract | Read through one configured RPC; no cache/indexer authority |
| Active wallet eligibility and voted status | Contract mappings | Public chain state; not anonymous |
| Authentication UI state | React component memory | Not an identity authority; resets on reload |
| Active transaction receipt | Chain RPC receipt returned to UI | UI labels one receipt confirmed; no finality policy |
| Candidate/election long-form metadata | Arbitrary URI string in contract, if supplied | Content is not fetched/verified by active UI |
| Old prototype voters/elections/ledger | Browser localStorage | Dormant, simulated, and not valid election truth |
| Frontend | Static Vite bundle | Not trusted for authorization; contract checks writes |
| Admin authority | Single Ownable address | Key custody/governance outside the app |

## Implementation update (2026-09-27)

After the baseline review above, the active dApp was updated to use configurable chain-specific viem fallback transports for read RPCs (`VITE_LOCAL_RPC_URLS`, `VITE_SEPOLIA_RPC_URLS`) and to check the configured chain ID before contract/election/audit reads. This is availability fallback, not an RPC quorum or proof of honest responses. The ballot transaction still uses the injected wallet; a returned transaction hash is retained if receipt polling fails, and the UI warns not to resubmit blindly. Wallet message wording now describes a local wallet-control check, not identity authentication. This update does not change the contract, privacy protocol, one-owner governance, or lack of Sepolia deployment.
