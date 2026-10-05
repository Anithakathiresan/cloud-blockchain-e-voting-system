# RPC, Availability and Privacy

The active dApp uses a viem public client for reads and transaction receipt polling. It accepts a chain-specific primary RPC URL plus optional comma-separated fallback URLs (`VITE_LOCAL_RPC_URLS` or `VITE_SEPOLIA_RPC_URLS`) and uses viem fallback transport. Contract reads check that the responding client reports the configured chain ID. This improves read availability, but it is not an independent quorum or proof that an endpoint is honest.

## Provider visibility

An RPC operator can generally observe the client's network address, requested chain, contract addresses, read methods, request timing and response patterns. Wallet reads that include an account may reveal that address. Using multiple RPCs can improve availability and allow cross-checking, but does not automatically provide privacy; all providers may see related requests. A wallet's own RPC may be a separate provider with separate policies.

## Failure and stale data

When election reads fail, the UI offers retry; audit-read errors are shown and can be retried. It does not compare provider block hashes, disclose block age, detect a fork, or distinguish stale data from a valid older response. State-changing calls are not automatically retried. If a transaction hash was returned but receipt polling fails, the UI retains the hash and warns that status is unverified. Before another vote action, a voter must check canonical on-chain `hasVoted` state.

## Future fallback requirements

If fallback is added, validate chain ID and expected contract code independently on each endpoint, track the read block number/hash, surface provider changes, and avoid combining data from inconsistent blocks. Never let an indexer/RPC cache override direct canonical chain state. Do not silently retry writes; wallet remains the signer. Document provider privacy and allow informed choice where practical.
