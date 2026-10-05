# Viva Guide

## Core explanations

**What is blockchain?** A replicated state machine whose transactions are ordered and checked by network consensus. It makes accepted history tamper-evident under the chain's assumptions; it does not make all stored data private or correct by itself.

**Why use blockchain here?** The demonstration places election transitions, eligibility checks, duplicate-vote enforcement and tally increments under shared contract rules rather than trusting one web server. The trade-offs are public data, transaction fees, latency and operational complexity.

**What is a smart contract?** Program code deployed at an EVM address. Calls can read its state; signed transactions execute state changes and are checked by the EVM.

**Why Solidity and Ethereum-compatible networks?** Solidity is the contract language for EVM chains; Hardhat provides a local EVM and test/deploy tooling. Sepolia is a test network, not a production election network.

**What does MetaMask do?** It manages a wallet locally, exposes an EIP-1193 provider and asks the user to approve signatures and transactions. This app never requests the seed phrase or private key.

**What is ECDSA?** The elliptic-curve signature scheme used by Ethereum accounts to authorize messages and transactions. The app recovers the signer of a wallet-control message locally; the contract checks the sender of each state-changing call. The message is not real-world identity verification or a replay-protected server session.

**What is Keccak-256?** Ethereum's Keccak hash function used for selectors and commitments. The contract hashes an election ID and wallet into an eligibility event commitment, but this is not an anonymity system; the eligibility transaction still contains the address.

**How is a second vote prevented?** The contract stores a boolean for each election and `msg.sender`. It checks the flag and sets it in the same atomic transaction as the tally increment.

**How is voter privacy protected?** No private voting protocol is implemented. The active UI disables ballot submission and does not persist candidate choice, but the legacy contract can still be called directly and exposes the wallet and candidate ID in calldata/events. Solidity `private` does not encrypt storage. The inactive JSX prototype is also not private and stores choices in localStorage.

**Why is there no Node.js API?** Browser code calls the contract through the wallet/RPC. The chain, not an application database, is authoritative for the implemented elections and tallies.

**How are results calculated?** Each accepted vote increments the selected candidate count on-chain. Once the election is ended, anyone can finalize it; the result getter then returns contract tallies. Anyone can independently inspect the public chain, including before finalization.

**What happens on a rejected or failed transaction?** A wallet rejection is shown distinctly. A submitted transaction is awaited for a receipt; a revert or RPC failure is shown as a failed operation. No success receipt is shown before confirmation.

**Why can't a wallet vote twice?** `castVote` checks and updates the per-election voter flag. The EVM executes the transaction atomically, so concurrent reuse of that account cannot pass twice.

## Likely questions

**Is this suitable for a real election?** No. It is an academic demonstration. It has no ballot secrecy, coercion resistance, external audit, multisig authority or independent eligibility process.

**What is a Merkle tree?** A tree of hashes that lets a verifier check membership using a compact path. A Merkle root alone does not make this system anonymous; a proof protocol and nullifier design are also required. This project does not implement one.

**What is a zero-knowledge proof?** A proof that a statement is true without revealing the witness. A reviewed ZK membership protocol could prove eligibility without exposing a wallet in the ballot transaction, but it is not currently integrated.

**What makes this a dApp?** The active UI is static client code, wallet-authorized actions go directly to a smart contract, and contract state is the source of truth. The optional RPC endpoint is transport infrastructure, not a vote API.

**Can the admin change a candidate after voting begins?** No. Candidate and eligibility writes require Draft or Scheduled state. Lifecycle functions also enforce their valid prior state.

**Can users see live results?** The UI's result getter is gated until finalization, but public transactions, logs and EVM storage are inspectable. Therefore live result secrecy is not guaranteed.

**What happens if the wallet disconnects?** The browser cannot submit authenticated actions until a wallet reconnects. Public election reads can still use the configured read RPC.

**What is the main future improvement?** Select and integrate a mature anonymous eligibility protocol with an independently reviewed proof verifier, then audit the resulting contracts and user workflow before making any privacy claim.