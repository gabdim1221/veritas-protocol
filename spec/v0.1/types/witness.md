# Tessera type: `witness`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

Attests that the issuer observed an event or fact at the issued time.

```json
"type_payload": {
  "observation": "<free text or structured claim>",
  "subject_hash": "<optional sha256 of an observed artifact>",
  "location": { "latitude": <float>, "longitude": <float>, "accuracy_m": <float> }
}
```

## Distinction from `attestation`

`witness` records what the issuer **observed** (an event, a state of the world, a fact). `attestation` records a claim about **another party**. If you find yourself reaching for `witness` to attest to a person's qualification, prefer `attestation` instead — see [`attestation.md`](attestation.md).

## Privacy

Location data, when included, is sensitive. Issuers SHOULD give the user fine-grained control over whether location is included and at what precision (e.g. coarse city-level vs. precise GPS).
