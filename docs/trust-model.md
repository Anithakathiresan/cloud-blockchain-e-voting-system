# Trust Model

The application removes an application server from the active vote path, but it does not eliminate trust. Each dependency below is explicit.

| Assumption | Why it exists | Current minimization | Compromise consequence | Detection / response |
| --- | --- | --- | --- | --- |
| EVM chain consensus and canonical history | Contract state is stored and executed by the selected chain. | Contract checks state/time and tallies; use a public testnet only for demonstration. | Reorg, censorship or consensus failure can change availability/observed inclusion/finality. | Compare independent RPC/explorer views; current UI does not implement finality/reorg handling. |
| Solidity/EVM correctness | Contract code determines election rules. | Solidity 0.8 checked arithmetic, OpenZeppelin Ownable, tests for selected invariants. | Bug or compiler/runtime defect may permit wrong state or block operation. | Independent audit/static/fuzz analysis is not yet present; preserve evidence and deploy a reviewed successor if needed. |
| Contract source and deployment address | Frontend points to a configured address. | Chain and address are environment-configured; deploy script records a local manifest. | Wrong/malicious contract may display false elections or request unsafe writes. | Current UI checks address syntax only; independently verify bytecode/source before using. |
| Eligibility authority | Someone determines which wallet addresses may vote. | Owner-authorized on-chain allowlist changes emit events and freeze after activation. | Unfair/malicious enrollment can exclude eligible voters or authorize extras; addresses are public. | Review enrollment transactions before start; no proof/appeal process is implemented. |
| Owner key custody | `Ownable` privileges belong to one address. | Secret is not in frontend or committed `.env.example`; wallet signs changes. | Loss can strand governance; compromise grants unilateral setup and pause/resume authority. | Public transactions expose actions; no automatic alert. Use multisig/key procedures before any controlled use. |
| Voter wallet correctness | Wallet signs a ballot transaction as a caller. | App never requests seed/private key; contract checks `msg.sender` and eligibility. | Stolen wallet can cast one vote or expose identity/activity. | Wallet provider/user detects compromise; no voter replacement protocol. |
| User device/browser | UI displays intent and constructs contract calls. | Contract enforces core state, eligibility, candidate bounds and duplicate rule. | Malware/compromised browser can misrepresent candidate or submit a different valid call. | Compare wallet transaction details and independent contract UI; static build integrity is not signed by app. |
| Wallet software | Wallet mediates signatures and transaction confirmation. | Wallet prompts; app differentiates message from vote transaction. | Malicious/compromised wallet can mislead, leak keys or sign malicious calls. | Keep wallet current, verify origin/network/action; no app-side wallet attestation exists. |
| RPC provider | Client needs chain reads and receipt polling. | Contract writes require wallet authorization; no centralized application API is used. Configurable fallback reads and chain-ID checks are present. | Providers observe requests, can censor/fail or return stale/malicious data; fallback is not a quorum. | Configure independently operated endpoints and compare critical state manually; no block-hash quorum/finality validation exists. |
| Static hosting/IPFS gateway | Browser must download frontend assets. | Static frontend can be built with relative URLs and hosted on IPFS. | Host/gateway can serve altered/unavailable code or observe IP. | Compare CID/build hashes through another gateway; app does not verify its own distribution. |
| Metadata publisher/pinner | URIs may point to election/candidate descriptions. | Metadata is optional and not authoritative for contract counters. | Mutable or unavailable content can mislead users. | Compare on-chain URI and expected CID; current app does not retrieve/validate content. |
| Cryptographic primitives | Wallet ECDSA/Keccak/RPC formats rely on standard libraries and chain rules. | Uses established viem/wagmi/OpenZeppelin rather than custom voting crypto. | Library/primitive bug can undermine signing or address/event interpretation. | Dependency lock/audit, updates and independent review; no crypto proof system currently exists. |
| Human election operators | Eligibility policy and election operation are external to Solidity. | Public events and lifecycle transactions provide some audit trail. | Insider error, coercion, unfair roll construction or weak observation. | Publish operating procedure and involve independent observers; not implemented by the app. |

## Important non-assumptions

- Do not assume wallet possession proves a real-world person or student identity.
- Do not assume `private` Solidity storage is secret.
- Do not assume a hash of an address is anonymous.
- Do not assume IPFS is private or always available.
- Do not assume a transaction receipt is final.
- Do not assume the frontend is truthful because it is decentralized/static.
- Do not assume an immutable contract is bug-free; immutable code makes correction a migration, not a patch.

## Trust reduction priorities

For research/testnet use: publish verified deployment metadata, validate code/address/network, add independent RPC/read-only verification, and define finality policy. For controlled elections: replace single-key administration with reviewed multisig governance and define eligibility issuance. For secret ballots: integrate a mature anonymous proof and ballot/tally protocol; current contract structure is not a compatible privacy layer by itself.
