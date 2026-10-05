# Privacy Migration Analysis

## Scope and decision status

This analysis covers the active application entry (`src/dapp/main.tsx`), its typed frontend (`src/dapp/App.tsx` and `src/dapp/contract.ts`), the Solidity source (`blockchain/contracts/VotingSystem.sol`), Hardhat deployment and tests, and the checked-in localhost manifest. The active frontend does not import the historical prototype under `legacy/`.

**Current state: public ballots.** The current system must not be used for a secret election. This document is the migration baseline, not evidence that privacy has been implemented. No code in the current vote path should be relabeled or reused as a private-voting protocol.

## 1. Why the current contract is public

EVM transaction calldata, event logs, and contract state are publicly observable. Solidity `private` visibility only restricts source-level accessors; it does not encrypt storage. The contract uses a public wallet authorization model and increments the selected candidate's public count immediately.

The contract also uses one `Ownable` address for creating and configuring elections. `setEligibility` accepts and emits a commitment derived from the voter address, which is not anonymous eligibility. The active frontend is read-only for this contract. Its signed message only demonstrates control of the connected wallet in that browser session; it does not authenticate a real person or hide their address.

## 2. Exact candidate-choice leak

The historical UI's `confirmVote` handler invoked `castVote(electionId, candidateId)` using the connected wallet. The current active UI removed that handler, omits the function from its ABI, and disables every state-changing contract action. A direct call to the legacy contract still makes transaction sender, election ID, and candidate ID public in calldata; the contract emits `VoteCast(electionId, candidateId)` and updates public candidate counters.

An observer can therefore construct `transaction sender -> election -> candidate` without decrypting anything. The event omits the sender as an explicit field, but the transaction itself supplies it. `mapping` visibility and finalized-only result getters do not hide the ballot; storage, calldata, and logs remain inspectable. The frontend's own audit and privacy text already acknowledges this.

## 3. Components that can be reused

- React, Vite, wagmi, viem, injected-wallet connection, chain switching, and transaction-receipt UX are reusable as transport/UI primitives, not as privacy mechanisms.
- Election discovery, public candidate metadata, schedule display, and read-only RPC configuration can be adapted to a new contract interface.
- Hardhat 3, Solidity compilation, local-node scripts, and the existing testing conventions can host an integration harness if the selected protocol's supported toolchain is compatible.
- The existing lifecycle concepts and honest privacy/threat documentation are useful requirements input.
- The existing single-vote contract, direct eligibility reads, current results, ABI, deployment manifest, and wallet-to-candidate receipt flow are not reusable for secret ballots.

## 4. Components that must be replaced

- Replace `castVote(electionId,candidateId)`, `VoteCast`, candidate counters, wallet-keyed duplicate state, and direct result calculation with a protocol-native encrypted message, anonymous eligibility/sign-up policy, replay protection, and proof-verified tally.
- Replace address allowlisting as the ballot authorization mechanism with a protocol-compatible eligibility policy and an election-scoped anonymous credential. Identity issuance may still disclose identity to an issuer; that trust boundary must be documented.
- Replace the current single-owner critical governance model with protocol-compatible multisig/timelock administration.
- Replace the current direct voter-wallet transaction path with the chosen protocol's supported message-relaying flow where available. A relay can reduce direct wallet-to-ballot linkage, but does not by itself hide IP, timing, or funding relationships.
- Replace the current ABI and deployment configuration only when a complete, supported protocol deployment is present. Never point the current UI at an incompatible or legacy contract.
- Replace the current verifier, which checks only state and count consistency, with protocol-native proof verification and an independent verifier/recount.

## 5. Migration risks

1. Existing deployments and ballots cannot be made secret retroactively. The current contract must be marked legacy for secret-election use; its chain history stays public.
2. Protocol circuits, trusted-setup artifacts, Solidity verifier contracts, client libraries, SDK versions, and chain configuration must match exactly. Using test proving keys or hand-edited verifier code is not a production deployment.
3. Eligibility identity issuance can reintroduce identity linkage, Sybil eligibility, or exclusion. A Merkle root only commits to a list; it does not establish that the list is fair or that its members are unique people.
4. Transaction senders, signups, relayers, RPC providers, IP addresses, timing, and gas funding can leak participation or permit correlation even when candidate choice is hidden.
5. A coordinator or decryption-key compromise may reveal ballot contents. MACI documentation explicitly places privacy against a trusted coordinator outside its guarantee; a single coordinator key is incompatible with a strict no-single-tallying-key policy unless an established threshold/MPC design is integrated.
6. Public result verification must validate protocol proofs and committed inputs, not merely compare a total with the contract's own getter.
7. A new contract does not neutralize the old frontend, copied ABI, stale `.env` address, cached deployment, or existing testnet contract. Active configuration and migration messaging must be checked together.
8. This workspace has no configured Sepolia deployment credentials or evidence of a real injected-wallet E2E session. Neither deployment nor MetaMask testing can be claimed from static inspection.

## 6. Protocol decision and current gate

The formal A-G comparison is in [privacy-protocol-selection.md](privacy-protocol-selection.md). No production protocol is selected. MACI is EVM-native and proof-backed but its documented coordinator key can decrypt messages. Semaphore provides membership/nullifier proofs, not encryption/tally. ElectionGuard has a documented guardian quorum, encrypted-ballot proofs, and independently verifiable election record, but no compatible audited EVM verifier and anonymous eligibility adapter is available in this repository. Cicada is an unaudited research implementation with no releases, an explicitly undersized-by-modern-norms default RSA modulus, and only temporary puzzle-delay privacy. Commit-reveal exposes the choice at reveal.

**Required answer: this repository cannot implement the required privacy properties without introducing an unverified cryptographic construction using the available maintained libraries and infrastructure.** Do not ship a placeholder contract accepting ciphertexts, wire Semaphore's public signal to a candidate, or add a single administrator decrypt key.

The safe engineering state is the current fail-closed active frontend, while keeping the existing Solidity source explicitly labeled `LEGACY_PUBLIC_VOTE_CONTRACT`. Direct contract calls remain possible and public for historical compatibility; no claim is made that UI changes disable the deployed contract.

## 7. Frontend privacy audit (current source)

- The active HTML entry loads `src/dapp/main.tsx` and `src/dapp/App.tsx`; it has no vote selection state and no call to `castVote`. The active ABI in `src/dapp/contract.ts` no longer declares that function. The displayed ballot action is disabled, and `canTransact` is hard-disabled for all legacy state changes.
- The active route hash stores only the selected view (`#/verify-election` or `#/`); candidate choice is not encoded in a URL or browser history entry.
- The active dApp does not write candidate choice to `localStorage`, `sessionStorage`, IndexedDB, analytics, console output, or error telemetry. The HTML theme preference is not ballot data. Transaction receipt state stores transaction hash/block only.
- Candidate names/metadata and public result counts are legitimate public election data, not local selected-choice state. The legacy ABI and `VoteCast` label are not part of the active ABI. The legacy contract's event remains public on-chain.
- The inactive `legacy/` prototype is materially different: its simulated `chain.js` serializes `candidateId`/`selections` into `localStorage`; `store.js` seeds sample ballot choices; the UI holds ballot drafts in React state. That localStorage ledger is not a blockchain and is not private. Its warning, receipt, and confidentiality copy explicitly state this.

## 8. RPC, receipt, tally, and governance boundaries

The active app has no ballot relay. If a user bypasses the UI and calls the old contract, the sender, candidate calldata, block/time, gas, contract and transaction hash are visible; RPC providers can also observe IP and request metadata. No protocol-level claim can prevent those leaks for a direct transaction.

The existing `#/verify-election` reads the legacy contract's configuration/results from a configured RPC and checks limited count consistency. A read-only recount tool can independently count `VoteCast` logs and compare that count to the legacy result getter, but cannot prove private ballot validity, anonymity, threshold decryption, or source identity. The legacy contract has no eligibility root, ciphertext commitment, nullifier, tally proof or candidate-set cryptographic commitment.

The legacy contract's direct administration remains single-owner `Ownable`, but the active UI is read-only and does not issue those writes. No multisig, timelock, trustee roster/key ceremony, emergency governance policy, or decentralized eligibility issuance is implemented. Adding OpenZeppelin `AccessControl` alone would not provide decentralized governance; a deployed multisig/timelock topology and tests would be required.

## Source findings

- `blockchain/contracts/VotingSystem.sol`: `castVote`, `VoteCast`, address allowlist, public candidate counters, `Ownable` lifecycle.
- `src/dapp/App.tsx`: no candidate-choice state or transaction handler; all legacy writes are disabled; chain reads and explicit public-ballot warnings remain.
- `src/dapp/contract.ts`: active ABI omits `castVote`; legacy Solidity artifacts remain public.
- `blockchain/test/VotingSystem.js`: tests exercise direct candidate voting and wallet duplicate rejection.
- `blockchain/scripts/deploy.js` and `blockchain/scripts/deployment-policy.js`: legacy deployment is restricted to local chain 31337; Sepolia is refused.
- MACI protocol overview: https://maci.pse.dev/docs/introduction
- MACI quick start and coordinator-key/deployment workflow: https://maci.pse.dev/docs/quick-start
- Semaphore V4 scope/nullifier and public signal: https://docs.semaphore.pse.dev/guides/proofs
- ElectionGuard guardian/quorum, ballot proofs and tally workflow: https://electionguard.vote/concepts/Structure_and_Processes/
- Cicada implementation and unaudited/default-parameter caveats: https://github.com/a16z/cicada