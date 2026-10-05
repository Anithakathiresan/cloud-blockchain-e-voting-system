# Deployment Status

No privacy-preserving contract is deployed. No Sepolia deployment, source verification, MetaMask ballot transaction, transaction hash, or private tally is claimed. Existing generated/local manifests refer to the legacy public-vote contract only.

## Local Legacy Contract

```powershell
npm ci
npm run contracts:compile
npm run contracts:node
```

In another terminal, deploy/seed only for local testing:

```powershell
npm run contracts:deploy:local
npm run contracts:demo
```

Configure the frontend with local chain ID `31337` and the printed local legacy contract address. The active UI remains unable to cast a ballot. Do not use the contract for secret elections.

## Sepolia

Deployment is pending external credentials and, more fundamentally, pending selection of an actual private-voting protocol. Do not deploy the legacy `VotingSystem` as a private-election contract. A future deployment must record a real address, chain ID, deployment transaction/block, source verification result, ABI/code hash, commit and timestamp; never fill these from a template or fabricate them.

Further legacy deployment instructions and RPC caveats: [docs/deployment.md](docs/deployment.md). Protocol blocker: [docs/privacy-protocol-selection.md](docs/privacy-protocol-selection.md).