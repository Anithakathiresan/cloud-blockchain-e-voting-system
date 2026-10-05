# Privacy and Data Boundaries

## Actual guarantees

- The application does not ask for student passwords, seed phrases or private keys.
- Voter records from the previous prototype are not loaded by the active dApp entry.
- The current contract accepts a wallet address as eligibility identity and permits one accepted ballot per eligible wallet per election.
- The interface does not store vote choices in browser storage and shows a participation receipt rather than a post-vote choice summary.
- Candidate and election metadata fields are public strings; the app does not upload content to IPFS.

## What is public

An EVM transaction exposes its sender and input data. `castVote(electionId, candidateId)` therefore reveals the wallet, election and candidate to chain observers. The `VoteCast` event also includes the candidate ID. Eligibility configuration transactions contain wallet addresses, and the eligible-wallet map is not cryptographically private. Hashing a wallet into an event commitment does not anonymize it because the input space is small and the state is still public.

Solidity `private` only prevents generated public getter methods. It does not encrypt blockchain storage. Even though `getResults` is lifecycle-gated until finalization, a motivated observer can inspect transaction calldata and contract storage before finalization. Do not claim hidden live results.

## Not implemented

There is no Semaphore group, zero-knowledge membership proof, Merkle eligibility root, nullifier-based unlinkable vote, encrypted ballot, threshold decryption, coercion resistance, or anonymous credential issuer. No custom cryptography has been invented. Wallet addresses are pseudonymous identifiers and may be linked to people through other activity.

## Suitable future privacy architecture

A production privacy design should use a reviewed ZK membership protocol and a domain-separated nullifier per election, verify the proof in a separately audited contract, and avoid putting candidate choice in plaintext transaction inputs. Result computation would need a reviewed encrypted/tally protocol or delayed decryption. This work requires protocol selection, circuit review, trusted setup analysis where applicable, and independent audit; it is not achieved by hashing or hiding a Solidity mapping.