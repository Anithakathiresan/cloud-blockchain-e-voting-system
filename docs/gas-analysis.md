# Gas and Capacity Analysis

**Status:** No gas measurements are recorded in the repository. Do not infer measured gas values from estimates or prior deployment output. Measurements depend on compiler, optimizer, EVM version, chain pricing and input lengths.

## Current complexity by operation

Let `k` be candidate count for one election.

| Operation | Approximate EVM work | Complexity / capacity note |
| --- | --- | --- |
| Contract deployment | Initializes owner and contract storage layout | Fixed code-deployment cost, but artifact bytecode dominates; no measured deployment gas report is checked in. |
| `createElection` | Writes one election and increments ID | O(1) storage writes plus name/URI calldata/storage proportional to byte length. |
| `scheduleElection` | Writes timestamps/status | O(1). |
| `addCandidate` | Appends one candidate and emits event | O(1) storage slots plus string-length cost. Repeated additions are individually bounded transactions; total list has no explicit maximum. |
| `setEligibility` | Writes one mapping slot and emits event | O(1) per wallet. Bulk enrollment requires one transaction per wallet; no batch API. |
| `start/pause/resume/end/finalize` | Checks and writes a few slots/events | O(1). Finalization does not loop candidates. |
| `castVote` | Checks mapping/state/index and increments two counters | O(1) per vote; calldata/event publicly reveal candidate choice. |
| `getElection` | Returns fixed election tuple | O(1) state reads and bounded output. |
| `getCandidates` | Allocates/copies all candidate records | O(k) execution and response; can exceed RPC response/eth_call limits for large k. |
| `getResults` | Allocates/copies every candidate result | O(k) execution and response; finalization itself remains O(1). |
| Frontend election enumeration | `nextElectionId` then parallel election and candidate reads | O(number of elections + total candidates) RPC calls/data; current code reads all elections and full candidate arrays. |
| Audit tab | One `getLogs` request over up to last 10,000 blocks | O(number of matching logs) response; range may be provider-capped and does not prove older history is absent. |

## Measurement procedure to add

Use the exact tagged source and compiler profile. For each operation, record transaction receipt `gasUsed`, representative and maximum supported input sizes, calldata bytes, chain ID, base/priority fee assumptions and dependency/compiler versions. Include deploy, election creation, candidate append (short/maximum metadata), eligibility update, vote, lifecycle transitions and finalization. Test the maximum supported candidate/election sizes and practical RPC responses.

## Current limitations

No explicit candidate count cap or string length limit is present. Candidate/result getters return arrays in full. Large voter sets require one eligibility transaction per wallet. This is reasonable only for a small academic demonstration; it is not a large-election design. A Merkle-root/proof architecture may improve eligibility scaling but is not currently implemented and needs its own verifier/gas audit.
