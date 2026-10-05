# Privacy Model

**Current conclusion:** ballot secrecy is not implemented. The active UI fails closed and does not submit a ballot, but the retained legacy contract remains directly callable and publicly reveals any direct vote. This application must not be described as an anonymous voting system or used for a secret/legally binding election.

## Data classification

| Class | Current data | Notes |
| --- | --- | --- |
| PUBLIC | Election names, metadata URI strings, schedule/state, candidate IDs/names/URIs, admin transactions, eligibility setup calldata, vote transactions/events, tallies/storage | EVM transactions, logs and storage can be inspected regardless of Solidity `private` visibility. |
| PSEUDONYMOUS | Wallet address, per-election eligibility/voted flags, transaction sender | A wallet address may be linkable to a person through external history. It is not an anonymous identity. |
| PRIVATE | Wallet seed/private key inside wallet software; any off-chain identity evidence held by a future eligibility issuer | The app must never request the key or seed. No voter PII is currently stored by the active contract. Off-chain identity storage policy is not implemented. |
| ENCRYPTED | No ballot payload in the current protocol | There is no encryption, threshold decryption, encrypted ballot, ZK proof or private tally in the active voting path. Wallet transaction signatures protect authorization, not ballot confidentiality. |
| TRUSTED | Chain consensus, deployed contract/source match, owner/eligibility authority, wallet/device, browser bundle, RPC provider, build dependencies, optional metadata host | These are trust assumptions, not privacy guarantees. See `trust-model.md`. |

## Linkability questions

- **Can an observer map wallet to vote?** Yes. `castVote(electionId,candidateId)` calldata and `VoteCast` event reveal the candidate ID and the transaction sender.
- **Can an observer map IP address to vote?** The chain does not include IP, but an RPC, wallet, relay, network observer or timing correlation may associate requests with an IP. There is no network anonymity mechanism.
- **Can an observer determine who voted?** They can identify the wallet that submitted a transaction. Mapping that wallet to a real person depends on external information. The eligibility transaction itself exposes wallet address.
- **Can a voter prove how they voted?** Yes, in this current design: the public transaction hash/calldata/event identify the candidate. This creates coercion and vote-selling risk.
- **Can the administrator correlate identity and ballot?** The admin sees eligible wallet addresses and public vote transactions. If the admin or another party can associate address to identity, choice is directly linkable.
- **Is nullifier unlinkability present?** No nullifier exists. The duplicate key is the wallet address per election.

## Protocol decision

Semaphore V4 is a maintained ZK anonymous-group signaling protocol. It can prove group membership and prevent repeated signaling under an external nullifier, but its signal is public. Using a candidate ID as the signal would therefore still expose the vote; submitting proofs directly from a voter wallet would also reveal the wallet transaction sender. Semaphore alone does not meet the current ballot-secrecy requirement.

MACI provides encrypted messages and proof-backed tallying but its documented coordinator key can decrypt; that conflicts with the no-single-party tally-key requirement. ElectionGuard documents guardian quorum keys and verifiable encrypted ballots/tallies but has no compatible EVM verifier/anonymous eligibility adapter in this repository. Cicada is unaudited research code with parameter and maintenance concerns. No private protocol has been installed or integrated. The formal A-G comparison and no-go decision are in [privacy-protocol-selection.md](privacy-protocol-selection.md).

Do not bolt a Semaphore proof onto the existing direct `castVote` path and call it private. Directly calling the legacy function still exposes sender and candidate in calldata/event.

## Coercion

**Coercion resistance is not guaranteed by this implementation.** Public transaction data can prove the candidate choice, and wallet/device monitoring can expose the action. No receipt-free protocol, revoting mechanism, decoy credential or coercion defense is present.
