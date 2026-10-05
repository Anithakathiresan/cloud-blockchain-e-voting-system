# Architecture Status

**Current architecture: legacy public-vote contract with a fail-closed active frontend.** This repository does not currently contain a private ballot protocol.

The active entry is `index.html` → `src/dapp/main.tsx` → `src/dapp/App.tsx`. It reads public contract state through viem and connects an injected wallet for a local wallet-control signature. It is read-only for the legacy contract: all state-changing transactions are disabled, and the active ABI in `src/dapp/contract.ts` omits `castVote`.

`blockchain/contracts/VotingSystem.sol` is labeled `LEGACY_PUBLIC_VOTE_CONTRACT`. Its direct `castVote(electionId,candidateId)` exposes candidate ID in calldata and `VoteCast`; the transaction sender reveals the wallet; candidate counters are public. The frontend guard does not prevent direct contract calls or change deployed contracts.

No replacement contract is created because no selected, maintained protocol with threshold tally and a compatible EVM verifier is available here without an unverified cryptographic bridge. Current protocol decision: [docs/privacy-protocol-selection.md](docs/privacy-protocol-selection.md). Migration findings: [docs/privacy-migration-analysis.md](docs/privacy-migration-analysis.md).

**Implemented:** read-only election state, administrative legacy actions, fail-closed voting UI, legacy event recount utility.

**Not implemented:** anonymous eligibility, election nullifier, encrypted ballot, valid-ballot proof, threshold tally, private receipt, trustee governance, or private-election verifier.