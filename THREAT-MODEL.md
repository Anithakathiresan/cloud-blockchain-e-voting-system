# Threat Model Status

The assessed implementation is the legacy public-vote contract and active fail-closed frontend. A detailed adversary and trust-boundary analysis is in [docs/threat-model.md](docs/threat-model.md).

**Protected by current code:** legacy contract lifecycle checks, address allowlist checks, per-wallet duplicate rejection, and frontend removal of the direct public vote action.

**Not protected:** ballot secrecy, voter anonymity, one-person-one-vote, coercion, RPC/IP correlation, eligibility fairness, transaction sender privacy, threshold key custody, or single-owner governance.

Every direct legacy `castVote` transaction discloses `candidateId` in calldata and `VoteCast`; sender/candidate correlation is direct. Chain observers also see block/time, gas, contract, and transaction hash. RPC operators may observe request metadata and IP. No voting relay or network anonymity system is implemented.

This is an engineering threat model, not an independent audit or election certification.