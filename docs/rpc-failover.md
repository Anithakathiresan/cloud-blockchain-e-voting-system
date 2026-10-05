# RPC Failover

## Current implementation

The active dApp now accepts chain-specific comma-separated read endpoints:

- `VITE_LOCAL_RPC_URL` (primary) and `VITE_LOCAL_RPC_URLS` (additional local-chain read endpoints)
- `VITE_SEPOLIA_RPC_URL` (primary) and `VITE_SEPOLIA_RPC_URLS` (additional Sepolia read endpoints)

The read client uses viem's fallback transport across configured endpoints. If no endpoint is configured, the chain's default RPC is used. Before contract reads, the frontend checks the responding client's chain ID against `VITE_CHAIN_ID`; a mismatch is surfaced rather than treated as election state.

Wallet writes are initiated via the injected wallet connector; the browser read RPC is used for receipt polling and state refresh. RPC URLs are public build/runtime configuration and may reveal request metadata. Do not put an API secret in a `VITE_*` URL unless the provider explicitly intends that credential to be public.

## Limits

- This is failover, not a quorum or proof that an RPC is honest. A malicious endpoint can serve false reads on the expected chain.
- The fallback transport does not independently compare every response/block hash against all providers.
- Receipt polling uses the configured read client and can fail after a transaction is already submitted. The UI retains the hash and warns the voter not to resubmit blindly; it does not guarantee finality or handle reorganizations.
- No private transaction relay, RPC privacy layer, or user-visible provider-health dashboard is implemented.
- If endpoints return inconsistent state, stop and verify via independent providers/explorer before any new state-changing action.

## Configuration example

```dotenv
VITE_CHAIN_ID=11155111
VITE_SEPOLIA_RPC_URL=https://sepolia.example-rpc.invalid
VITE_SEPOLIA_RPC_URLS=https://another-sepolia-rpc.example,https://third-sepolia-rpc.example
```

Use real endpoints appropriate to the operator. The `.invalid` hostname above is illustrative only.
