# Reproducible Build and Deployment Provenance

## Current build inputs

- Runtime: README specifies Node.js 22 or newer; an exact Node/npm toolchain pin is not present in the repository.
- Package manager: npm, with `package-lock.json`; use `npm ci` for lockfile-based installation.
- Frontend command: `npm run build` using Vite; Vite `base: './'` emits relative paths for static/IPFS hosting.
- Type command: `npm run typecheck` with strict TypeScript settings for `src/dapp`.
- Contract compiler: Solidity 0.8.28 from Hardhat profile `default`, optimizer enabled, 200 runs; source pragma is `^0.8.24`.
- Contract build/test commands: `npm run contracts:compile`, `npm run contracts:test`.
- ABI source: Hardhat artifact is generated; the active browser uses a handwritten ABI in `src/dapp/contract.ts`, which must be kept synchronized.

## Current limits

The package manifest uses `latest` for Vite, React, React DOM and the React plugin. The checked lockfile pins a resolution for the present install, but regenerating it at another date can select different versions. The repository does not declare an exact npm version, Node file, container image digest, OS/toolchain digest, build attestation or signed frontend release. A build is not yet reproducible in the stronger supply-chain sense.

## Recommended release record

For each reviewed release, publish and retain:

- Git commit ID and clean/dirty worktree status.
- Node/npm versions and OS/container image digest.
- Lockfile SHA-256 and dependency audit/license output.
- Solidity source SHA-256, exact solc version, optimizer settings, EVM target and Hardhat version.
- Full compiler artifact/ABI SHA-256 and deployed runtime bytecode SHA-256.
- Chain ID, contract address, deploy transaction hash, deployment block/hash and timestamp.
- Frontend `dist/` manifest/hash and IPFS CID (if used).
- Environment variable names and public values used for build; never include secret values.
- Test, static-analysis, accessibility and security review results, including skipped checks.
- Reviewer identity/approval and any known-risk acceptance.

## Deployment manifest status

The current deploy script records network, chain ID, contract address, deployer, deployment block and ABI. It does not record deployment transaction hash, block hash, timestamp, source commit, ABI hash, runtime code hash, compiler settings or contract semantic version. No public testnet deployment was located in tracked repository state.
