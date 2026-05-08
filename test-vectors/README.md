# Tessera Conformance Test Vectors

This directory will hold the canonical conformance test vectors for Tessera v0.1. A conformant verifier MUST treat every "valid" vector as VALID and every "invalid" vector as the documented failure mode.

## Status

Empty in Phase 0. Test vectors land in **Phase 1** alongside the reference verifier (`@veritas/verifier`).

Required vectors for v0.1 conformance (per `spec/v0.1/tessera.md` §9):

- `authorship/valid-loa2.json`
- `authorship/valid-loa3.json`
- `authorship/valid-loa4.json`
- `authorship/invalid-bad-signature.json`
- `authorship/invalid-bad-anchor.json`
- `authorship/invalid-revoked.json`
- `authorship/invalid-content-mismatch.json`
- `delegation/valid-chain.json`
- `delegation/invalid-expired.json`
- `revocation/valid.json`

## Layout

```
test-vectors/
├── README.md
├── authorship/
│   ├── valid-loa2.json
│   ├── valid-loa3.json
│   ├── valid-loa4.json
│   ├── invalid-bad-signature.json
│   ├── invalid-bad-anchor.json
│   ├── invalid-revoked.json
│   └── invalid-content-mismatch.json
├── delegation/
│   ├── valid-chain.json
│   └── invalid-expired.json
└── revocation/
    └── valid.json
```

Each invalid vector ships with a sibling `.expected.json` describing the failure mode the verifier MUST return (e.g. `INVALID_SIGNATURE`, `DELEGATION_EXPIRED`, `REVOKED`).
