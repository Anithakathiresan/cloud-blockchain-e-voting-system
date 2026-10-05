# Privacy Migration Analysis

The source-by-source leak analysis, reusable/replaced components, migration risks, active/inactive frontend audit, RPC metadata analysis, and protocol gate are maintained in [docs/privacy-migration-analysis.md](docs/privacy-migration-analysis.md).

The current Solidity source is explicitly labeled `LEGACY_PUBLIC_VOTE_CONTRACT`. Candidate ID remains public in its direct-call calldata and `VoteCast`; public counters and sender correlation remain in historical/deployed contract state. The active frontend no longer exposes the call but cannot disable direct contract interaction.

No private replacement is implemented. See [PRIVACY-PROTOCOL-SELECTION.md](PRIVACY-PROTOCOL-SELECTION.md) for the concrete no-go decision.