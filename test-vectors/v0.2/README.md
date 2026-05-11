# Tessera v0.2 Conformance Test Vectors

Three new vectors exercising the optional `composition_analysis` field added in
[spec/v0.2/tessera.md §13](../../spec/v0.2/tessera.md). Each bundle (`tessera` +
`delegation`) is self-contained and signed under the same deterministic test
identity (`alice`) used by the v0.1 vectors.

**v0.2 conformance also requires the 10 v0.1 vectors at
`../authorship/`, `../delegation/`, `../revocation/`** (per spec §9). v0.2 is
strictly additive over v0.1; verifiers must accept Tesserae with or without
`composition_analysis`.

## Vector matrix

| File | Expected | Session | human / ai / ambig (%) | Confidence | policy_eligible_categories |
|------|----------|---------|------------------------|------------|-----------------------------|
| `composition_pure_human.json` | VALID | 30 min | 95.0 / 0.0 / 5.0 | high | `academic_70_plus`, `journalism_60_plus`, `creative_writing_50_plus` |
| `composition_hybrid.json` | VALID | 60 min | 70.0 / 22.0 / 8.0 | high | `academic_70_plus`, `journalism_60_plus` |
| `composition_mostly_ai.json` | VALID | 45 min | 28.0 / 65.0 / 7.0 | medium | _none_ |

## Invariants exercised

Each vector's `composition_analysis` satisfies invariants 1–6 from §13.3:

1. **Bucket sum** equals `total_session_ms` (exact equality, well within ±100ms).
2. **Percentage sum** equals exactly 100.0 (within [99.0, 101.0]).
3. **Non-negativity** holds for every `_ms` and `_pct`.
4. **Authorship time** ≥ 1000ms — sessions are 30, 60, 45 minutes long.
5. **Voice authorship** counts toward `human_pct`. The hybrid and mostly-AI vectors
   include a non-zero `voice_authored_ms` that the issuer-computed `human_pct`
   correctly attributes to humans.
6. **No partial population** — every required sub-field is present.

A fourth conformance case in
[`confirmata-verifier/test/conformance.test.ts`](../../../confirmata-verifier/test/conformance.test.ts)
mutates a copy of `composition_hybrid.json` to violate invariant 1 and asserts
that the verifier surfaces `COMPOSITION_INVARIANT_VIOLATION`.

## Classifier identity

All three vectors declare `classification_method: "confirmata_classifier_v1.0"`.
Other implementations producing vectors for downstream testing should declare
their own identifier matching the regex `^[a-z_]+_classifier_v\d+\.\d+$`.

## Regeneration

These vectors are emitted by the v0.2 extension to
`../../../confirmata-verifier/scripts/generate-vectors.ts`. To regenerate:

```bash
cd ../../confirmata-verifier
npx tsx scripts/generate-vectors.ts
cp -r test-vectors/v0.2/* ../confirmata-protocol/test-vectors/v0.2/
```

Note: the v0.1 vectors at `../authorship/`, `../delegation/`, and `../revocation/`
are pinned to their committed bytes. The deterministic-key reproduction guarantee
documented at `../README.md` predates an upstream `@noble/ed25519` API change and
no longer holds bit-exactly for v0.1; v0.2 regeneration produces consistent bytes
against the current library state.
