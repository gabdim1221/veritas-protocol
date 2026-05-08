# Tessera type: `revocation`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

Revokes a previously-issued Tessera. The revocation Tessera itself is anchored, providing tamper-evident proof of when revocation occurred.

```json
"type_payload": {
  "revoked_tessera_hash": "<sha256 hex of the Tessera being revoked>",
  "reason": "<compromised | mistake | retracted | superseded | other>",
  "reason_text": "<optional free text>"
}
```

## Effect of revocation

A revocation Tessera is itself anchored on the OpenTimestamps clock. The anchor's block time defines the **revocation timestamp**.

For verifiers:

- A Tessera whose hash appears in a revocation Tessera MUST be treated as REVOKED if the verifier's policy rejects revoked Tesserae outright.
- For long-running evidence (e.g. authorship claims attached to published works), a verifier MAY treat Tesserae issued **before** the revocation timestamp as VALID and Tesserae issued **after** the revocation timestamp as INVALID. This is the recommended behavior for `delegation` revocations: prior content remains valid, future content under the revoked device is not.
- The verifier's policy SHOULD make this decision explicit and surface it to the consumer of the verification result.

## Authority to revoke

Only the issuer of a Tessera (or a delegation chain rooted at the same master key) may revoke it. A revocation Tessera that does not chain back to the original master key MUST be ignored.
