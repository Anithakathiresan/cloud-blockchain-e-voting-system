# Known Limitations

This project remains an academic/testnet demonstration. It is not production-ready, independently audited, certified, anonymous, or coercion-resistant.

## Privacy and eligibility

- Candidate ID is public in vote calldata and `VoteCast`; wallet → election → candidate is linkable.
- Eligibility is a wallet address allowlist; no Semaphore/MACI/Merkle-ZK eligibility flow or nullifier is implemented.
- No encrypted ballot, private tally, threshold decryption, receipt-freeness or coercion resistance exists.
- Wallet addresses are pseudonymous; public chain, RPC and network metadata can enable correlation.
- **Coercion resistance is not guaranteed by this implementation.**

## Governance and contract

- One OpenZeppelin `Ownable` owner controls configuration and critical lifecycle actions; no multisig/timelock is deployed.
- Contract has no upgrade mechanism, configuration commitment, explicit input/count bounds, or tested governance recovery process.
- Fixing deployed contract behavior requires a new address and transparent migration/cutover.

## Deployment and operations

- No Sepolia deployment or wallet-driven Sepolia ballot test has been performed; no contract address is provided as a Sepolia deployment.
- RPC failover is best-effort read transport, not a trustless quorum. Chain-ID checks do not prove bytecode/source identity.
- UI awaits receipt inclusion, but does not implement chain-specific finality, confirmation-depth policy or reorg recovery.
- Local Hardhat chain/address/state reset when the node restarts. Development keys are public and local-only.
- IPFS upload, metadata CID validation/pinning/gateway fallback, source verification, complete provenance manifest and indexer are absent.

## Quality and assurance

- Contract suite covers 11 scenarios; no frontend automation, wallet E2E, fuzz/invariant suite, formal verification or independent contract audit is evidenced.
- Accessibility has not been certified against WCAG 2.2 AA; modal focus handling requires further testing.
- No CI, secret scanner, full dependency/license review, monitoring implementation or exercised disaster-recovery process exists.
- Full `npm audit` reports 11 low-severity transitive advisories in the Hardhat/Ethers `elliptic` chain with no available fix; production-only audit currently reports 0 vulnerabilities.
- Dormant legacy JSX prototype remains in the source tree. It is not the active entry, but includes insecure localStorage credentials and a simulated ledger; do not reactivate it.
