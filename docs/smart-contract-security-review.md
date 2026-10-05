# Smart-Contract Security Review

**Status:** Source-level review only; not an independent audit.  
**Reviewed source:** `blockchain/contracts/VotingSystem.sol`.  
**Compiler configuration:** Solidity 0.8.28, optimizer enabled, 200 runs in the current Hardhat profile.  
**Date:** 2026-09-27.

## Summary

The current contract has useful baseline checks: OpenZeppelin `Ownable`, explicit election states, time-window checks, eligibility and per-wallet duplicate-vote prevention, candidate bounds, and no external calls in `castVote`. It has no proxy/delegatecall path. These reduce several basic implementation risks but do not provide ballot privacy or administrative decentralization. The active vote choice is public by design.

This review did not execute Slither, Mythril, Solhint, Foundry, formal verification, or an independent audit. No static-analysis result should be inferred from this document.

## Checklist findings

| Area | Code observation | Assessment / residual risk |
| --- | --- | --- |
| Access control | Owner modifier inherited from OpenZeppelin gates create/schedule/candidate/eligibility/start/pause/resume. | Basic role boundary exists; single owner is a critical operational risk. `endElection` and `finalizeElection` are intentionally permissionless after state/time conditions. |
| Lifecycle | Explicit state checks in start/pause/resume/end/finalize. | Start requires scheduled time reached and before end; pause/resume cannot extend the fixed end; anyone can end once time has passed. No cancel/abort/extension/recovery process. |
| Vote window | Requires Active and `startsAt <= block.timestamp < endsAt`. | Correct half-open interval in contract. Block timestamps have chain-specific semantics and are not precise civil-time guarantees. |
| Duplicate vote | Checks and sets `voterHasVoted[electionId][msg.sender]` in same transaction. | Prevents duplicate transactions from the same wallet/election; not one-person-one-vote or multi-wallet/Sybil resistance. |
| Candidate index | Checks index against stored array length. | Out-of-range rejected. No explicit candidate count/length cap; full-list getters can become costly. |
| Arithmetic | Solidity 0.8 checked increments. | No unchecked math. Extreme count/array/storage/gas limits still need capacity analysis. |
| Reentrancy | `castVote` and state transitions make no external calls. | No apparent reentrancy path in current code. Reassess if callbacks, tokens, hooks or external verifier calls are added. |
| External calls | No low-level calls/delegatecall in contract. | Avoids unchecked-call and proxy storage-collision classes in the present immutable design. |
| Upgradeability | No proxy. | Avoids proxy admin/initializer/storage-layout risks; fixes require redeployment and a public migration policy. |
| Signature replay | No contract signature verification. | Contract relies on `msg.sender` and EVM account transaction nonce. Frontend message signature is local and has no authorization effect. If signatures are added, domain, chain, contract, nonce and expiry rules need review. |
| Public ballot data | `castVote` has `candidateId`, `VoteCast` emits election and candidate. | Critical privacy disclosure. Anyone can map sender to choice. No amount of `private` visibility changes this. |
| Eligibility data | Mapping keyed by wallet; event hashes election/wallet but tx calldata contains the wallet. | Eligibility is public/pseudonymous and administrator-chosen; no ZK proof or Merkle membership. |
| Candidate/election immutability | Candidate and eligibility updates only Draft/Scheduled; schedule only Draft. | Once Active, those fields are locked. Election name/metadata remain fixed by lack of mutators. No explicit canonical configuration hash proves intended setup. |
| Pause/griefing | Owner may pause active election before end and resume before end. | Auditable state event, but no reason, delay, second approval, maximum duration, or time compensation. Single owner can reduce effective voting opportunity. |
| Finalization | Permissionless only from Ended; results getter only Finalized. | Prevents early use through public getter but does not make underlying storage/transactions private. No untrusted caller can write counts. |
| Denial of service | Candidate list and result getters loop over candidate array; no cap. | `addCandidate` is owner-only, but a faulty/malicious owner can make reads exceed practical RPC/gas limits. `getResults` is view and does not cost a transaction to caller, but execution limits still apply. |
| Timestamp/ordering | Uses `block.timestamp` for transition/vote checks. | Normal EVM timestamp assumption; chain consensus can allow bounded variation. No block-number or finality check. |
| Events | Important transitions and configuration changes emit events. | Vote event explicitly leaks selection. Events omit explicit actor argument, though sender is available from transaction. No reason string for pause or canonical config commitment. |
| Ownership transfer | Inherited OpenZeppelin Ownable functions exist. | No frontend workflow or governance runbook. Owner loss/compromise recovery has not been exercised. |
| Constructor | `Ownable(msg.sender)`. | Deployer becomes owner. Deployment identity and expected runtime bytecode are not checked by frontend. |

## Test evidence

`blockchain/test/VotingSystem.js` contains 11 scenario tests. It checks owner/admin boundaries, schedule timing, candidate/eligibility updates, inactive/invalid/ineligible/duplicate voting, pause/resume, post-start locks, ending/finalization and result counts. It is not fuzzing, invariant testing, reorg simulation, gas-bound testing, or privacy testing. Refer to `docs/testing.md` for execution commands.

## Required follow-up before testnet use

- Run a pinned-version static analyzer and record exact tool/version/findings.
- Add fuzz/invariant properties for vote uniqueness, state monotonicity and immutable finalized state.
- Add maximum candidate/string lengths and capacity/gas measurements.
- Verify deployed bytecode against source/compiler settings and publish chain/address/provenance.
- Decide admin governance and emergency pause/abort policy.
- Select an audited privacy protocol before claiming secret ballots.
- Obtain independent review; this document is not a substitute.
