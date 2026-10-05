# Security Review

This is a source-level academic review, not an independent audit or certification.

## Contract controls reviewed

| Risk | Current control | Residual limitation |
| --- | --- | --- |
| Unauthorized administration | OpenZeppelin `Ownable` modifiers | One key controls the election authority; no multisig or timelock |
| Double voting | `voterHasVoted[electionId][msg.sender]` checked and set in one transaction | Wallet identity is visible and a person can control multiple wallets unless eligibility provisioning prevents it |
| Voting before/after window | Contract timestamp checks in start, resume, vote and end | Chain timestamp is a consensus value, not a precise wall clock |
| Candidate/eligibility changes after activation | Writes require Draft or Scheduled status | Eligibility can still be edited before activation; audit/provisioning process is external |
| Result tampering | Tallies only increment during accepted votes; no admin setter | Direct votes and storage remain public; no anonymous tally protocol |
| Reentrancy | Vote path has no external calls | Reassess if token payments or external hooks are added |
| Arithmetic | Solidity 0.8 checked arithmetic | Extreme-scale gas and block limits still require capacity analysis |
| Replay of vote transaction | EVM transaction nonce plus per-election spent flag | Cross-chain replay/domain separation is not part of a ZK proof because no proof system exists |
| Secrets in frontend | No private keys or RPC credentials are compiled into `VITE_*` values | Operators must keep deployment keys out of frontend environment variables and source control |

## High-severity product limitation

Ballot secrecy is not provided. A public observer can correlate `msg.sender` with candidate ID from transaction data and event logs. The current system is appropriate only for local demonstrations and controlled academic experiments using non-sensitive ballots.

## Operational controls before any testnet use

- Use a dedicated deployment account and test ETH only.
- Verify chain ID, contract address and compiled ABI before enabling writes.
- Protect `SEPOLIA_PRIVATE_KEY` outside the frontend and source repository.
- Independently review the exact deployed bytecode and deployment transaction.
- Test ownership transfer and recovery procedures.
- Treat RPC providers and wallet extensions as availability and privacy dependencies.
- Do not deploy for a real election without protocol design, external audit, threat modeling, accessibility review and legal approval.