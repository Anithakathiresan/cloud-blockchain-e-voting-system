# Feature Matrix

| Feature | Implemented | On-chain/off-chain | Tested | Security mechanism | Privacy impact | Documentation |
| --- | --- | --- | --- | --- | --- | --- |
| Static React dApp | Yes | Off-chain static files | Build and typecheck | No server-side vote authority | Hosting/provider can observe requests | README, architecture |
| Wallet connection | Injected connector | Wallet/browser | Manual UI not automated | Wallet controls key; contract still checks caller | Wallet address exposed to chain | README, voting flow |
| Wallet-control message signature | Local recovered message | Browser memory | Not automated | Random nonce, address/chain text; no server consumption/domain/expiry | No PII sent, but not real-world identity | Authentication docs |
| Election creation | Yes | Contract | Contract tests cover admin access; deploy demo observed | Ownable | Name/URI public | Smart-contract docs |
| Candidate setup | Yes | Contract | Contract tests cover unauthorized/post-start writes | Owner-only, frozen after activation | Candidate name/URI and IDs public | Smart-contract docs |
| Eligibility | Wallet allowlist | Contract | Selected eligibility tests | Owner-only, locked after start | Wallet address public; no anonymous proof | Privacy analysis |
| Single-choice voting | Yes | Contract | Duplicate/invalid/time scenarios | Per-wallet/election used flag and state/time checks | Candidate choice publicly linkable to wallet | Privacy analysis, voting flow |
| Anonymous voting | No | N/A | N/A | No ZK/Merkle/Semaphore/nullifier | Requirement not met | Privacy analysis |
| Double-vote protection | Per address/election | Contract | Scenario test | Atomic mapping check/set | Reveals voter address/status to observers | Invariants |
| Election lifecycle | Six states | Contract | Selected scenario tests | Explicit transitions and timestamps | State and actions public | Smart-contract docs |
| Emergency pause | Yes, single owner | Contract | Pause/resume/deadline scenario tests | Owner-only, state/time gated | Pause action public | Threat model |
| Results | Finalized-only getter | Contract | Example count test | Increment-only counts; getter status gate | Votes are already public; no secrecy | Smart-contract docs |
| Transaction receipt | Hash/block after one receipt | Browser/RPC | Not wallet-E2E tested | Wait for receipt and inspect status | Hash can prove public choice by calldata | Voting-flow docs |
| Finality/reorg recovery | No | N/A | No | None | Incorrect status can mislead | Gap analysis |
| Admin multisig/timelock | No | N/A | No | Single Ownable key only | Admin actions public | Threat model |
| Audit UI | Recent decoded event names, block/hash | Direct RPC logs | Browser read observed | Reads chain logs | Vote event exposes candidate | Current-state analysis |
| Read-only election verifier | Partial | Direct RPC/contract reads | Typecheck/build; no automated verifier test | Checks chain ID/code presence and finalized tally sum | Does not remove public wallet-choice link | Verification docs |
| Full audit/recount/verify route | No | N/A | No | No config/eligibility/result commitments or complete log reconstruction | Needed for independent assurance | Gap analysis |
| IPFS metadata upload/fetch validation | No; URI field only | URI on-chain; no content workflow | No | None beyond address string | Gateway/publisher can observe retrieval | Privacy analysis |
| RPC failover | Configurable URL-list read fallback | Off-chain transport | Typecheck/build; no outage integration test | Viem fallback transport and configured-chain ID checks before reads | Providers observe read metadata; no quorum/privacy relay | RPC failover docs |
| Local deployment | Yes | Hardhat | Prior deploy/demo path observed | Script emits local manifest | Test-only public accounts | README, deployment |
| Sepolia deployment | Script/config only; no verified deployment | Operator-run | Not run against Sepolia | Operator key configured outside Vite | Public chain data | Deployment docs |
| Static/IPFS build | Relative Vite asset base | Static | Production build passed | Content-addressed hosting is optional | Gateway request metadata | Reproducible-build docs |
| Legacy voter registration | Dormant only | localStorage | Not part of active dApp | Unsafe client-side credential check | Seeded personal-like data and passwords | Current-state analysis |
| Automated frontend/E2E | No | N/A | N/A | No coverage | N/A | Testing docs |
| Accessibility testing | No automated evidence | N/A | Responsive-only manual checks previously | Some semantic/ARIA labels | Accessibility impact unassessed | Gap analysis |
