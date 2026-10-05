# Independent Verification (Current Capability)

## Available today

A read-only “Verify election” view at `#/verify-election` accepts one supported network, contract address and election ID. It checks the responding RPC chain ID, confirms runtime bytecode exists, reads election/candidate state directly, and for finalized elections compares the sum of candidate counts to the contract-reported total. It displays the runtime bytecode hash as an observation, not as a match against reviewed source. The audit tab queries recent logs for the configured address and shows recognized event names, block numbers and transaction hashes. Sepolia transaction hashes link to Etherscan.

This is a bounded read-only verifier, not full end-to-end election verification. It accepts only supported networks with an available read RPC. It does not verify bytecode against reviewed source/version, prove the event scan is complete, show a canonical configuration hash/eligibility root/result commitment, reconstruct individual anonymous ballots, reconcile all votes independently, identify the finalization transaction, or track finality/reorganizations. Local transactions have no public explorer link.

## Verification properties

- The contract is authoritative for current execution state when queried from a correct canonical chain and correct deployed address.
- `getResults` is available only after Finalized, but chain data can reveal the pre-finalized tally/vote choices.
- A receipt hash proves a provider returned inclusion; one confirmation is not a universal finality guarantee.
- The direct vote implementation allows a third party to infer a voter's candidate from calldata/event. A verification receipt can therefore expose the choice.

## Requirements for a future verifier

An independent page/CLI should accept chain ID, RPC, verified contract address and election ID; compare runtime code to reviewed deployment metadata; read election/candidate/finalization state directly from chain; decode all logs from deployment block through a chosen finalized block; independently tally per protocol; compare count conservation and contract results; show block hashes/confirmation/finality state; and display “verified” only when every check passes. If any provider or log range is incomplete, say “unable to verify,” not “verified.”
