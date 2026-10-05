# LEGACY / NON-ACTIVE PROTOTYPE

This directory contains the former browser-only JSX prototype and its demo candidate images. It is retained for historical reference only. **LEGACY SIMULATION: NOT A PRIVATE OR BLOCKCHAIN VOTING SYSTEM.**

It is **not** the active application, is not loaded by `index.html`, and must not be treated as blockchain-backed election state. It contains insecure localStorage-based demo credentials/roles and a simulated local hash ledger that stores ballot selections in plaintext alongside pseudonymous voter digests. Its receipt does not provide ballot secrecy. Do not deploy it, restore `legacy/src/main.jsx` as the page entry, use its credentials, or represent its local data as real votes.

The active dApp entry is `index.html` → `src/dapp/main.tsx`.
