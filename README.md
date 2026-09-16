# BallotLedger

BallotLedger is a cloud-ready, blockchain-first electronic voting prototype. It gives voters a clear ballot experience while separating the concerns that matter in a digital election:

- wallet-based cryptographic eligibility checks;
- one-vote-per-election enforcement;
- tamper-evident vote receipts and ledger events;
- responsive voter, candidate, results, and privacy views;
- a Solidity contract foundation for local Hardhat or Sepolia deployment.

## Current project

The Vite application in `src/` is a complete front-end prototype. It runs without a wallet or RPC endpoint so the workflow can be reviewed immediately:

1. Connect a demo wallet.
2. Review candidates.
3. Select a candidate and review the confirmation dialog.
4. Submit the ballot and open the receipt.
5. Inspect results, identity separation, and ledger status views.

The UI currently uses in-memory state for this demo. The contract in `blockchain/contracts/VotingSystem.sol` is the integration boundary for the next step: replacing demo actions with `ethers.js` calls to a deployed contract.

## Run locally

```bash
npm install
npm run dev
```

Create a production bundle with:

```bash
npm run build
```

## Architecture

```text
React / Vite UI
	|
	+-- wallet signature and eligibility proof
	|
	+-- ethers.js adapter (next integration)
	|
Ethereum-compatible network
	|
VotingSystem.sol
	+-- election schedule and state
	+-- candidate registry and tally
	+-- eligibility and duplicate-vote guard
	+-- receipt hash and audit events
```

Voter identity should remain outside public vote payloads. A production privacy layer should use an anonymous nullifier plus a zero-knowledge eligibility proof (for example, a Merkle-root membership proof) before sending a ballot transaction. The current Solidity contract is a teaching and integration foundation: its candidate identifier is visible on-chain and must not be presented as full ballot secrecy until that proof layer is implemented.

## Suggested production path

1. Add Hardhat scripts and contract tests for election lifecycle, eligibility, and duplicate voting.
2. Add an `ethers.js` adapter and MetaMask connection state to the React UI.
3. Replace the demo wallet and in-memory vote state with contract reads and signed transactions.
4. Add a Merkle-tree eligibility registry and zero-knowledge proof verifier for ballot privacy.
5. Deploy the front end to Vercel or AWS and the contract to a controlled EVM network or Sepolia.
6. Keep candidate documents and larger election metadata in IPFS, storing only the CID on-chain.

This separation keeps personal information out of the public ledger while preserving a verifiable record of election state and ballot processing.
