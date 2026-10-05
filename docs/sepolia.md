# Sepolia Deployment Status and Procedure

## Current status

No Sepolia deployment address is recorded in tracked repository state, and no actual Sepolia deployment has been performed. Do not infer an address from the local Hardhat deployment. The current deployment script is intentionally guarded against deploying the legacy public-ballot contract to Sepolia.

**Actual Sepolia deployment: NOT PERFORMED.** No address is fabricated here.

## Operator procedure

1. **Current blocker:** select and integrate a maintained protocol that meets ballot secrecy, anonymous eligibility, valid-ballot verification, independently verifiable tally, and the required no-single-party decryption model without an unverified bridge.
2. Have the selected protocol and governance reviewed independently; pin protocol, contracts, SDK, circuit and trusted-setup artifact versions.
3. Only then prepare isolated Sepolia credentials and a governed deployment runbook. Never expose deployment secrets through `VITE_*` variables.
4. Deploy the actual selected protocol, independently inspect its receipt/runtime/source verification, and write real deployment metadata. Do not bypass the legacy deployment guard for `VotingSystem`.
5. Configure frontend chain/address/version checks from actual deployment metadata; perform MetaMask E2E, inspect actual calldata/events, verify the tally independently, and publish evidence. No deployment or wallet ballot test is claimed now.

## Required release metadata

A reviewed `deployments/sepolia.json` should contain network, chain ID, contract address, deployment transaction, block number/hash, compiler and optimizer settings, contract version, ABI hash, runtime code hash, source commit, timestamp, deployer/governance address, and source-verification URL/status. The current script does not yet satisfy that full manifest requirement.

Do not publish private keys, seed phrases, provider API secrets, or deployer credentials in the manifest.
