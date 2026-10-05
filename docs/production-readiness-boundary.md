# Production Readiness Boundary

This software is an **academic engineering prototype / research-grade dApp**. It is not automatically certified for public, governmental, legally binding, or high-stakes elections. It does not provide ballot secrecy or coercion resistance and has not received an independent security audit. A successful build or local demo is not evidence of production readiness.

## What remains outside the software implementation

Before any real organizational use, the responsible organization must separately establish and validate:

- Jurisdiction-specific election law and legal review.
- Election certification and procurement requirements where applicable.
- Independent smart-contract, privacy-protocol, frontend, infrastructure and operational security audits.
- Formal voter-registration and real-world identity-verification procedures.
- A fair eligibility issuance, correction, appeal, cutoff and revocation policy.
- Physical and administrative security for governance signers and voter devices.
- Multi-party key custody, key rotation, recovery and signer succession.
- Independent election observation and recount procedures.
- Incident response, communications, dispute adjudication and disaster-recovery exercises.
- Accessibility certification and accommodations for voters who cannot use the supported wallet/device.
- Privacy impact assessment and lawful handling of off-chain eligibility records.
- Chain/RPC selection, congestion, censorship, reorganization and finality policy.
- Long-term contract and metadata availability, IPFS pinning and source verification.
- Coercion, vote-buying, household surveillance and compromised-device threat treatment.
- Operational monitoring that remains non-authoritative and does not alter votes/results.

## Current explicit boundary

The current public candidate identifier, voter wallet and transaction are linkable. Eligibility is a wallet allowlist. Administration is controlled by one owner address. There is no ZK proof, anonymous group, election nullifier, encrypted ballot, multisig, timelock, reorganization handling, deployment code verification, formal analysis or independent audit. It is therefore suitable only for local demonstration, code review and controlled non-sensitive research with informed participants.

No screen, logo, transaction receipt, test result, or blockchain property should be represented as proof of legal validity, universal security, anonymity or coercion resistance.
