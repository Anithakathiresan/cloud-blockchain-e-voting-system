# Eligibility

## Current mechanism

The owner calls `setEligibility(electionId, wallet, eligible)` while the election is Draft or Scheduled. The contract stores a boolean under the election and wallet. `castVote` checks that flag and a per-wallet voted flag. Eligibility transactions are public; the event hashes `(electionId, wallet)`, but transaction input/storage still expose the address.

This mechanism answers only: “Was this EVM address authorized by the contract owner?” It does not answer whether the address belongs to a real eligible student, whether one person has multiple eligible wallets, or whether the list is fair and complete.

## Freeze behavior

The contract rejects eligibility edits after the state leaves Draft/Scheduled. This provides an on-chain setup freeze, but there is no separately committed eligibility snapshot/root, approval quorum, published list hash, identity appeal, or privacy proof.

## Required future design

Define a lawful/transparent eligibility issuer and off-chain identity handling policy. For anonymous membership, select a reviewed protocol that commits eligible members to an on-chain root and verifies a proof with a scoped nullifier. Specify root update authority, update cutoff, revocation, duplicate-person handling, lost-wallet recovery and audit events. Do not place names, email, DOB, phone or government IDs on-chain or IPFS. A Merkle root by itself does not prove anonymous membership and is not implemented now.
