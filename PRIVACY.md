# Privacy Status

**No private voting protocol is implemented.** The active frontend is read-only for the legacy contract: no state-changing contract transaction or candidate selection is submitted, stored, logged, or encoded in its URL. The frontend regression tests enforce the absence of the old call and ballot persistence.

The legacy Solidity contract remains public and directly callable. It exposes candidate choice in `castVote` calldata and `VoteCast`, and publishes per-candidate counts. A UI-only block does not make that contract private.

The inactive `legacy/` prototype stores plaintext ballot selections in `localStorage`; its receipt is not confidential. It is excluded from the active entry and labeled as a simulation.

EVM metadata is public even under a future encrypted ballot: sender, block/time, gas/payment, contract, transaction hash, and submitted ciphertext/proof bytes. RPC providers can observe IP/request metadata. This project makes no network-anonymity or coercion-resistance claim.

See [docs/privacy-protocol-selection.md](docs/privacy-protocol-selection.md) for the no-go decision and [docs/privacy-migration-analysis.md](docs/privacy-migration-analysis.md) for the source audit.