# Verification Status

The active `#/verify-election` page reads public state from the user-selected RPC and legacy contract. It shows chain, address, runtime code hash, election configuration/status and finalized public results, with explicit limitations. It is not a source verification, private ballot, or proof-verified tally page.

## Independent Legacy Event Recount

The read-only `scripts/verify-election.ts` scans public `VoteCast` logs in block chunks, counts each candidate event independently, and compares those counts to the legacy getter only as a consistency check. It requires the correct scan start block (usually deployment block) to avoid omitting earlier events.

```powershell
$env:RPC_URL = 'http://127.0.0.1:8545'
$env:CONTRACT_ADDRESS = '<operator-provided local deployment address>'
$env:CHAIN_ID = '31337'
$env:ELECTION_ID = '0'
$env:FROM_BLOCK = '0'
npm run verify-election
```

Supply the real address and deployment block from the local deployment output; the placeholder above is not an address.

This recount is specifically for the legacy **public** contract and reveals candidate IDs through its event data. It does not establish source identity, event semantics, ballot secrecy, anonymous inclusion, eligibility correctness, or a private tally. Independently compare chain ID, contract bytecode/source, and scan range using another provider before relying on the result.