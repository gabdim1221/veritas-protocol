# Tessera type: `authorship`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

The primary type used by Veritas. Attests that the issuer authored the referenced content.

```json
"type_payload": {
  "subject": {
    "content_hash": "<sha256 hex of the work>",
    "content_size_bytes": <integer>,
    "content_mime": "<mime type>",
    "content_filename": "<optional>",
    "content_uri": "<optional URI to a stable copy>"
  },
  "session": {
    "started_at": "<ISO-8601>",
    "ended_at": "<ISO-8601>",
    "duration_ms": <integer>,
    "tools_used": ["<tool identifier>", ...]
  },
  "behavioral_fingerprint": "<base64url sha256 of fingerprint vector>",
  "process_recording_hash": "<optional base64url sha256 of encrypted recording>",
  "ai_assistance_disclosure": "<none | spell_check | grammar | research | generation | other>"
}
```

A JSON Schema for this payload is published at [`spec/v0.1/schemas/authorship.schema.json`](../schemas/authorship.schema.json).

## Privacy

The `behavioral_fingerprint` is a hash. The raw fingerprint vector stays on the issuer's client and is never transmitted unless the issuer explicitly releases it.

The `process_recording_hash` is a hash of an encrypted blob. The plaintext is never part of the Tessera; release of the encrypted recording requires explicit user consent.

See `tessera.md` §10 (Privacy Considerations).

## Verification

`authorship` Tesserae follow the verification algorithm in `tessera.md` §8, including the optional content-hash check (step 6) when the verifier has the original bytes.
