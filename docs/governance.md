# Governance

## Current implementation

The `VotingSystem` contract uses one OpenZeppelin `Ownable` address, set to the deployer. That owner can create and schedule elections, configure candidate/eligibility data before activation, start, pause and resume. Anyone may end an election after its scheduled end and finalize only after it is ended. The contract emits state/configuration events.

There is no multisig, timelock, governance proposal flow, second-party approval, threshold signature, signer rotation UI, or ownership recovery procedure. Owner authorization is on-chain, but the governance trust model remains centralized in one key.

## Operational key rules

- Never store administrative private keys in source, Git, frontend `VITE_*` configuration, IPFS or logs.
- Hardhat accounts/private keys printed by the local node are public test keys and must remain on chain 31337 only.
- Separate local, staging/testnet and any future production signers.
- A testnet deployment key may be loaded by Hardhat as a Node-side secret; it must never be bundled into the static frontend.

## Future governance migration

A future controlled deployment should use an established multisig such as Safe rather than custom multisig logic. Choose an approval threshold based on independent signers, availability/recovery requirements, and the consequences of both compromise and signer loss. Critical actions should include election creation/configuration, eligibility commitment changes, activation, pause/end/finalization and any contract migration. Consider a timelock for non-emergency changes and a narrowly scoped, auditable emergency pause. Governance thresholds and emergency authority are design decisions, not currently implemented values.

Because this contract is immutable and the UI detects `owner()` directly, changing the governance model requires a new deployment or an explicit ownership transfer to a governance contract, plus frontend support, tests, signer procedures, published address/provenance and an election cutover decision. Do not claim multisig hardening until a deployed multisig-controlled contract is verified and exercised.
