# Tessera Protocol

The open standard for cryptographic attestation of human acts. Apache 2.0.

**Current spec.** [`spec/v0.2/tessera.md`](spec/v0.2/tessera.md)
**JSON Schema.** [`schemas/tessera-v0.2.json`](schemas/tessera-v0.2.json)
**Conformance test vectors.** [`test-vectors/`](test-vectors/)
**Reference implementation.** [Confirmata](https://confirmata.io) — the reference deployment of the `authorship` Tessera type.

## v0.2 — what's new

v0.2 is strictly additive over v0.1. It introduces the optional top-level
`composition_analysis` field on `authorship` Tesserae, enabling
capture-enabled clients to carry a graduated breakdown of how an authorship
session was spent — time-bucketed into human, AI-assisted, voice, paste,
review, and idle states — together with issuer-computed authorship
percentages and a self-described classifier identity. See
[§13 of the v0.2 spec](spec/v0.2/tessera.md) for the full semantics and
verifier obligations, and [§14](spec/v0.2/tessera.md) for the design
rationale (graduated truth over binary verdicts; classifier transparency;
verifier-side policy enforcement).

Every v0.1 Tessera is a valid v0.2 Tessera. v0.2 verifiers MUST accept
Tesserae with or without `composition_analysis`.

## Previous versions

- v0.1: [`spec/v0.1/tessera.md`](spec/v0.1/tessera.md), schema at [`schemas/tessera-v0.1.json`](schemas/tessera-v0.1.json), 10 conformance vectors at [`test-vectors/{authorship,delegation,revocation}/`](test-vectors/).
