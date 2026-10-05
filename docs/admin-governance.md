# Administrator Governance

## Current model

`VotingSystem` uses one OpenZeppelin `Ownable` owner. That address controls election creation, scheduling, candidate and eligibility setup, start, pause and resume. Ending and finalizing are permissionless after contract state/time checks. Owner transactions are public and state changes emit events.

The frontend labels the connected address as owner after reading `owner()`, but this display is not authorization. Each protected contract function enforces the owner.

## Risk

The owner is a single point of failure and trust. Key compromise or collusion among people sharing that key permits unilateral setup/eligibility/timing actions. Ownership is not configured as a multisig in this repository. No timelock, proposal review, quorum, pause reason, emergency policy, signer succession or practiced recovery is provided.

## Governance migration decision

For a future controlled deployment, choose a threshold based on independent accountable signers and recovery constraints (for example, a 2-of-3 Safe is a design option, not an existing feature or automatically correct threshold). Define signer independence, hardware-wallet use, timelock/notice periods, emergency pause rights, ownership handover, key loss/compromise and in-progress election treatment. Verify every action through the governance contract and expose proposals/approvals/executions in the UI. Avoid custom multisig code. If governance changes, update frontend owner detection and integration tests.

No production keys belong in source, frontend environment variables, Git or IPFS. Local Hardhat development keys are publicly known and must stay on chain 31337 only.
