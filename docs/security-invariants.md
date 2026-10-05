# Security Invariants

These statements describe the current contract. They are candidate properties for automated invariant testing; only those explicitly listed in `blockchain/test/VotingSystem.js` have scenario-test evidence. No formal proof is claimed.

Let `E` be an existing election, `A` an EVM address, `C` a candidate ID, `t` the execution timestamp, and `S(E)` the election state.

## Current contract invariants

1. **Vote uniqueness per address/election**  
   For every `E,A`, accepted calls satisfy:
   $$acceptedVotes(E,A) \le 1$$
   Enforced by `voterHasVoted[E][A]`, set atomically with the first accepted vote. This is not a person-level invariant.

2. **Eligibility required**  
   $$acceptedVote(E,A) \Rightarrow eligibleVoters[E][A] = true$$

3. **Active-window requirement**  
   $$acceptedVote(E,A,t) \Rightarrow S(E)=Active \land startsAt(E) \le t < endsAt(E)$$

4. **Candidate validity**  
   $$acceptedVote(E,A,C) \Rightarrow 0 \le C < candidateCount(E)$$

5. **Count conservation**  
   For each accepted vote, exactly one candidate counter and the total counter increment by one; for a rejected transaction neither changes.
   $$totalVotes(E) = \sum_{C=0}^{candidateCount(E)-1} candidateVotes(E,C)$$
   This equality is intended by current code and scenario-tested for a small case; it lacks property-based fuzzing.

6. **Candidate/eligibility freeze after setup states**  
   Candidate/eligibility mutators succeed only if `S(E)` is `Draft` or `Scheduled`.

7. **Start preconditions**  
   `startElection(E)` succeeds only from `Scheduled`, at/after `startsAt`, before `endsAt`, and with at least one candidate.

8. **End/finalize sequence**  
   `endElection(E)` succeeds only from `Scheduled`, `Active`, or `Paused` and at/after `endsAt`. `finalizeElection(E)` succeeds only from `Ended`.

9. **Results gate**  
   `getResults(E)` returns only if `S(E)=Finalized`. This does not conceal underlying public state or calldata.

10. **No count setter**  
    No function accepts an externally supplied tally. In the current contract, accepted `castVote` is the only write path to candidate and total counters.

## Desired post-finalization property

For a finalized election and unchanged canonical chain state:
$$result(E,t_2) = result(E,t_1) \quad \forall t_2 > t_1$$

There is no mutator for finalized election counts/configuration, and current tests check a representative finalized tally. Reorganizations can change canonical history, so the property must be qualified by the network's finality assumptions.

## Properties not implemented

- There is no `nullifier` and no nullifier-reuse invariant.
- There is no eligibility proof to bypass or verify.
- There is no anonymous membership property.
- Candidate selection is public, so no ballot-secrecy invariant exists.
- There is no multisig threshold invariant.
- There is no verified code/address/configuration commitment invariant.
- There is no transaction-finality invariant in the frontend.

## Suggested future fuzz/invariant properties

- Generate arbitrary legal/illegal state-transition sequences and assert no backward transition except explicit Paused-to-Active.
- Fuzz voter/candidate IDs, timestamp boundaries, candidate count and address eligibility.
- After arbitrary accepted/rejected vote sequences, assert count conservation and one vote per `(E,A)`.
- After Finalized, assert all configuration/count state is unchanged under every exposed external call.
- Assert non-owner cannot call owner-gated functions across all states.
- Assert no vote succeeds for invalid election/state/window/eligibility/candidate.
