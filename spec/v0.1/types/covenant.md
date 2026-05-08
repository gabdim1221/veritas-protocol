# Tessera type: `covenant`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

A two-or-more-party agreement. Each party signs the same payload; the resulting collection of signatures forms the covenant.

```json
"type_payload": {
  "covenant_id": "<UUID>",
  "parties": ["<user_handle>", "<user_handle>", ...],
  "terms": "<free text or structured claim>",
  "subject_hash": "<optional sha256 of attached document>",
  "effective_from": "<ISO-8601>",
  "effective_until": "<ISO-8601 | null>",
  "co_signatures": [ /* other parties' signatures, each a Tessera */ ]
}
```

## Multi-party signing

A covenant is fully formed when every party listed in `parties` has produced a Tessera with matching `covenant_id`, `terms`, `subject_hash`, `effective_from`, and `effective_until`. Each party's Tessera is independently anchored on the OpenTimestamps clock — there is no central registry or sequencer.

The `co_signatures` array on any one party's Tessera carries the other parties' Tesserae for convenience; it is not required for verification (a verifier may also fetch each party's Tessera independently).

## LOA recommendations

For low-stakes mutual agreements, LOA2 is acceptable. For multi-party agreements with legal weight (settlements, real estate, employment), LOA4 (KYC-bound) is recommended for every signing party.
