# Authentication

## Current browser flow

The active dApp connects an injected wallet and asks it to sign a message containing the address, current chain ID and a random nonce generated in the browser. The app recovers the signer locally and stores the matching address in React state as a wallet-control check for the current tab. Changing account/chain clears that state. The signature is not uploaded and does not authorize a contract call; the wallet signs every state-changing transaction separately.

## Security limitations

There is no server or contract consuming the nonce, so there is no durable replay ledger. The challenge lacks explicit origin/domain, app/contract identifier, issue/expiry timestamps and a verifier-defined session. As a result this is a local possession-of-wallet UX prompt, not a robust authenticated session and not proof of a real-world voter identity. It resets on reload. Contract authorization is still based on `msg.sender` and `Ownable`/eligibility.

## Secret handling

The app must never request or store seed phrases, private keys or wallet passwords. Deployment private keys are Node-side operator secrets and must never use a `VITE_` prefix. Authentication signatures should not be logged or sent to unrelated services.

## Safer future challenge

If a verifiable session is needed, use a structured domain-bound message (origin/domain, chain ID, intended application/contract, purpose, unique nonce, issued-at and expiration) and a verifier that consumes each nonce once. If no trusted verifier/backend is desired, avoid claiming a replay-protected authenticated session; wallet transaction authorization remains the authoritative mechanism. Do not reuse a login signature as vote authorization.
