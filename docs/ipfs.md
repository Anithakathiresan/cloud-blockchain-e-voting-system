# IPFS and Static Content

The Vite build uses relative asset paths (`base: './'`) and can be uploaded as static content under an IPFS CID. The active app does not upload content, fetch election metadata, pin images, or validate CIDs. Contract metadata fields are arbitrary public strings and do not prove content integrity by themselves.

## Static frontend deployment

1. Build with `npm ci` and `npm run build` using reviewed public environment values.
2. Inspect the `dist/` output and publish the exact directory to IPFS/pinning provider.
3. Record the resulting CID and build/source hashes in a reviewed deployment record.
4. Open through a gateway; if one gateway is unavailable, try another gateway/native IPFS client with the same CID and compare the content.
5. Keep contract state reads directed to the configured EVM chain. IPFS provides files only; it is not election-state authority.

## Metadata security

Future authoritative descriptions/images should use content-addressed CIDs and a canonical metadata schema. Commit the expected CID/hash on-chain before activation, validate fetched bytes against it, and provide more than one retrieval path. CIDs provide integrity addressing, not confidentiality, personhood, moderation, availability or trustworthiness. Never place voter PII, passwords, private keys or seed phrases on IPFS.
