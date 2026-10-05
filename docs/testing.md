# Testing

## Contract suite

Run:

```powershell
npm run contracts:compile
npm run contracts:test
```

`npm test` runs legacy contract scenarios, the legacy deployment guard, event-recount helper tests, and active-frontend privacy-boundary regression tests. It does not run browser or wallet E2E tests.

The tests cover deployer ownership, unauthorized creation/candidate/eligibility writes, invalid and premature schedules, inactive voting, eligibility and candidate validation, duplicate voting, pause/resume, post-start configuration locks, end-time enforcement, permissionless end/finalization, and reproducible finalized results.

The contract suite uses Hardhat's isolated EVM and current Ethers/Mocha toolbox. It does not depend on the running local JSON-RPC node.

## Frontend checks

```powershell
npm run typecheck
npm run build
```

The frontend is typechecked and built. The active UI intentionally has no ballot submission path. No actual MetaMask transaction or browser wallet E2E has been performed.

## MetaMask Sepolia procedure

**Status:** Not performed and currently blocked. The legacy deployment script refuses non-local chains, and no private protocol is integrated. No Sepolia address or browser-wallet ballot transaction evidence exists. Do not submit a public candidate-ID vote.

Prerequisites: operator-deployed and independently verified Sepolia contract, test ETH, MetaMask, a demo election, an eligible test wallet, and no production/private voter data.

1. A future protocol owner must first select and deploy a reviewed private-protocol contract. Do not use the legacy `VotingSystem` deployment on Sepolia.
2. Connect MetaMask and confirm the account and network in both the page and wallet. Switch away and back once to verify the wrong-network message/switch action.
3. Use “Verify wallet” and confirm MetaMask presents a message signature, not a transaction. Reject once and confirm no voter state changed. Approve once; note this only checks control in this browser tab and is not real-world authentication.
4. Confirm the active UI has no enabled ballot action. This is the required current behavior, not a failed wallet integration.
5. Check that the legacy verifier labels its result as public-state-only and that the event-recount tool reports candidate IDs as public.
6. Reject and approve wallet-control signatures only; verify that neither changes contract state. This signature is not an identity proof.
7. Verify wrong-network messaging and read-only state refresh. Do not perform a direct legacy `castVote` transaction if secrecy is expected.
8. A future protocol's full wallet E2E must separately test proof generation, transaction calldata, logs, replay/nullifier, and tally verification after a real reviewed deployment exists.

Do not conduct deliberate invalid transactions against an unrelated live election. Test wrong-network, insufficient gas and outage cases on local Hardhat or an operator-owned Sepolia demo only. A transaction with a returned hash but missing receipt must be treated as status-unknown until independently reconciled; do not blindly resubmit.

## Manual local checks

1. Start a local node, deploy/seed the legacy demo, and configure `.env.local`.
2. Connect the local owner wallet and verify the wallet-control signature and read-only legacy state.
3. Confirm the UI disables ballot submission even for an eligible wallet in an active demo election.
4. Run `npm test`, `npm run typecheck`, and `npm run build`; use the independent event recount only for a controlled finalized legacy election.

Do not use local Hardhat accounts on any public network.