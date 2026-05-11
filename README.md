# Tessera Protocol

The open standard for cryptographic attestation of human acts. Apache 2.0.

**Current spec.** [`spec/v0.2.1/tessera.md`](spec/v0.2.1/tessera.md)
**JSON Schema.** [`schemas/tessera-v0.2.1.json`](schemas/tessera-v0.2.1.json)
**Conformance test vectors.** [`test-vectors/`](test-vectors/)
**Reference implementation.** [Confirmata](https://confirmata.io) — the reference deployment of the `authorship` Tessera type.

## v0.2.1 — what's new

v0.2.1 is strictly additive over v0.2 (and transitively over v0.1). It
introduces one optional auxiliary sub-field: `composition_analysis.paste_events`,
recording the source classification of each paste event during a session
so verifiers can distinguish AI-tool pastes (cheating vector) from research
quotations (legitimate) from internal own-work pastes (likely authorship
continuity). The field carries no enforcement weight on its own — bucket
totals (§13.2) remain the canonical authorship measurement — but it gives
verifiers (publications, universities, employers) evidence they can apply
against their own policies. See
[§13.6 of the v0.2.1 spec](spec/v0.2.1/tessera.md) for the full schema,
invariants, and a worked policy example.

Every v0.2 Tessera is a valid v0.2.1 Tessera. v0.2.1 verifiers MUST accept
Tesserae with or without `paste_events`.

## v0.2 — composition analysis

[`spec/v0.2/tessera.md`](spec/v0.2/tessera.md), schema at
[`schemas/tessera-v0.2.json`](schemas/tessera-v0.2.json). Adds the optional
top-level `composition_analysis` field on `authorship` Tesserae, enabling
capture-enabled clients to carry a graduated breakdown of how an authorship
session was spent.

## Previous versions

- v0.1: [`spec/v0.1/tessera.md`](spec/v0.1/tessera.md), schema at [`schemas/tessera-v0.1.json`](schemas/tessera-v0.1.json), 10 conformance vectors at [`test-vectors/{authorship,delegation,revocation}/`](test-vectors/).
