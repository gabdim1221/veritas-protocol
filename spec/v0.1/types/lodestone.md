# Tessera type: `lodestone`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

A long-running preference signal — used to record a stable opinion, vote, or stance over time. Lower-stakes than other types; LOA0 or LOA1 sufficient.

```json
"type_payload": {
  "topic": "<string identifier>",
  "stance": "<free text or structured claim>",
  "supersedes": "<optional sha256 of prior lodestone Tessera on the same topic>"
}
```

## Threading

A user may issue many lodestones on the same `topic` over time. The `supersedes` field links each new lodestone to the one it replaces, forming a chain. Verifiers and aggregators SHOULD treat the latest unrevoked lodestone in a chain as the user's current stance, with the historical chain available as evidence of the user's evolution on the topic.

## Anti-spam guidance

Because lodestones are intended to be lightweight (LOA0 acceptable), a malicious actor could spam them. Aggregators SHOULD apply rate limits, ignore lodestones from unverified master keys, or weight by LOA when computing aggregate stances.
