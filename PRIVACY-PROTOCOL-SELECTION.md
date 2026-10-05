# Protocol Selection

The formal A–G evaluation, including ballot secrecy, anonymous eligibility, nullifiers, metadata leakage, tally and verification properties, key assumptions, coercion, EVM/frontend fit, implementation availability, and this repository's integration status, is maintained in [docs/privacy-protocol-selection.md](docs/privacy-protocol-selection.md).

**Decision: no production protocol selected; no-go.** This repository cannot safely provide the required anonymous eligibility, election-specific nullifier, valid encrypted ballot, independently verifiable tally, and no-single-party decryption authority with the available maintained integrations without an unverified cryptographic bridge. The active frontend remains fail-closed.