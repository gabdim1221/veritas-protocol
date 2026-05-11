# Tessera v0.2.1 Conformance Test Vectors

This directory adds three vectors exercising the `composition_analysis.paste_events`
auxiliary array introduced in [spec/v0.2.1/tessera.md §13.6](../../spec/v0.2.1/tessera.md),
and carries forward the three v0.2 `composition_analysis` vectors as a
backward-compatibility check.

**v0.2.1 conformance also requires the 10 v0.1 vectors at
`../authorship/`, `../delegation/`, `../revocation/`** (per spec §9). v0.2.1
is strictly additive over v0.2 (and transitively over v0.1); verifiers must
accept Tesserae with or without `paste_events`.

## New for v0.2.1

| File | Expected | Session | human / ai / ambig (%) | paste events | Notes |
|------|----------|---------|------------------------|--------------|-------|
| `paste_forensics_ai_heavy.json` | VALID | 45 min | 21.7 / 60.9 / 17.4 | 4 (2 `ai_tool`, 1 `research_quotation`, 1 `internal_authored`) | Buckets satisfy a permissive threshold but a verifier policy banning `ai_tool` pastes can reject. |
| `paste_forensics_research_heavy.json` | VALID | 90 min | 91.1 / 0.0 / 8.9 | 6 (5 `research_quotation`, 1 `internal_authored`) | Quotation-heavy authorship; satisfies `academic_70_plus`, `journalism_60_plus`, `creative_writing_50_plus`. |
| `paste_forensics_empty.json` | VALID | 30 min | 100.0 / 0.0 / 0.0 | 0 (`paste_events: []`) | Empty-array path — exercises §13.6.3 invariant 1. |

## Carried from v0.2 (unchanged bytes)

- `composition_pure_human.json`
- `composition_hybrid.json`
- `composition_mostly_ai.json`

These are bit-identical to `../v0.2/composition_*.json`; their inclusion
here proves v0.2 Tesserae continue to validate under the v0.2.1 schema.

## Invariants exercised

The three new vectors' `paste_events` arrays satisfy spec §13.6.3:

1. **Optionality** — `paste_forensics_empty.json` has `paste_events: []`; valid.
2. **Ordering** — every event's `timestamp_ms` is strictly less than the next event's.
3. **Bounds** — every `timestamp_ms` lies in `[0, total_session_ms]`.
4. **Bucket reference** — every `contributed_to_bucket` is one of the six bucket names.
5. **Classification enum** — every `source_classification` is from the closed enum.
6. **Content privacy** — only `size_chars` and `source_evidence` are recorded; no pasted content or content hashes.

## Identity

All vectors are signed under the same deterministic alice identity used by
the v0.2 composition vectors:

- master pubkey: `T81Auc_g57iYuiYP8O6osEVPhTfsX9RB7TTAN6t5R8A`
- device pubkey: `L52q0DKmR1ePGGoH8nzDX-TjIHAIRMJ8WDYLpyjd-jw`
- delegation hash: `a46fdd274445e62bad2538cd0c39bbedf770213f36947c5fe87db1c5cb6c8ebc`

The generator at `../../scripts/generate-v0.2.1-vectors.mjs` aborts if the
delegation hash drifts from the v0.2 alice hash, so any future
`@noble/ed25519` upgrade that breaks key-derivation continuity will be
caught immediately.

## Regeneration

```bash
node scripts/generate-v0.2.1-vectors.mjs
node scripts/validate-vectors.mjs schemas/tessera-v0.2.1.json
```

Both commands are pure-Node, self-contained within the protocol repo.
