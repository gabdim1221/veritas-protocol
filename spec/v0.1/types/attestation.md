# Tessera type: `attestation`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

Attests to a fact about another party (e.g. employer attesting to employment, peer attesting to skill). Distinguished from `witness` in that the subject is another party rather than an event.

```json
"type_payload": {
  "subject_handle": "<user_handle being attested to>",
  "subject_master_pubkey": "<base64url>",
  "claim": "<free text or structured claim>",
  "valid_from": "<ISO-8601>",
  "valid_until": "<ISO-8601 | null>"
}
```

## Use cases

- An employer issues an `attestation` to an ex-employee certifying the period and role of employment.
- A peer issues an `attestation` certifying that another user authored a specific work (defense-in-depth alongside the original `authorship` Tessera).
- An institution issues an `attestation` certifying a credential (degree, certification, license).

## Trust model

The verifier's confidence in an attestation depends on (a) the LOA of the attestation Tessera itself, and (b) the verifier's prior trust in the issuer. v0.1 does not define a global reputation system; consumers are expected to bring their own trust assumptions about issuers (e.g. "I trust attestations from a verified `.edu` email's master key").

## Revocation

If the attested-to fact ceases to be true (employment ends, credential revoked), the issuer SHOULD issue a `revocation` Tessera referencing the original attestation.
