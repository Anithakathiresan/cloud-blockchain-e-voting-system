# Deployment

## Local Hardhat

1. Install with `npm ci` and compile using `npm run contracts:compile`.
2. Start `npm run contracts:node` in a dedicated terminal. Its accounts and keys are public test credentials; never use them on public networks.
3. Run `npm run contracts:deploy:local`. The script writes `blockchain/deployments/localhost.json` with network, chain ID, address, deployment block and ABI. Deployment output is intentionally ignored by Git.
4. Run `npm run contracts:demo` to create a `DEMO:` election, three candidates and three eligible local wallets. This command refuses chain IDs other than 31337.
5. Copy `.env.example` to `.env.local`, set the local chain ID, RPC and contract address, then run `npm run dev`.
6. Add the local RPC network to MetaMask and use disposable Hardhat accounts only on that local chain.

## Sepolia

The current `contracts:deploy:sepolia` command is intentionally blocked by `assertLegacyDeploymentNetwork`: it refuses to deploy `LEGACY_PUBLIC_VOTE_CONTRACT` to any chain except local Hardhat 31337. No private protocol is integrated, and no Sepolia address is committed or claimed. Do not bypass the guard by editing the chain check. A future protocol deployment requires a selected maintained implementation, reviewed configuration, external credentials, real source verification, and updated frontend integration.

## Static host and IPFS

`npm run build` emits `dist/` with relative asset paths. Upload the contents of `dist/` to IPFS and pin the resulting CID with Pinata or another provider. An IPFS gateway can then load the UI from that CID. Configure the contract address and chain at build time; Vite variables are public configuration, not secrets. An RPC endpoint remains necessary. IPNS or a DNSLink domain can point to changing CIDs, but is optional.

## Configuration

| Variable | Used by | Secret? |
| --- | --- | --- |
| `VITE_CHAIN_ID` | Browser chain expectation | No |
| `VITE_VOTING_CONTRACT_ADDRESS` | Browser contract target | No |
| `VITE_LOCAL_RPC_URL` | Browser local reads/writes | No |
| `VITE_SEPOLIA_RPC_URL` | Browser Sepolia reads/writes | No; use only if provider policy permits public use |
| `SEPOLIA_RPC_URL` | Hardhat deployment | Provider endpoint may include a secret; keep local |
| `SEPOLIA_PRIVATE_KEY` | Hardhat deployment signer | Yes; never expose or commit |

Only public static content belongs on IPFS. Never upload passwords, personal voter records, seed phrases or private keys.