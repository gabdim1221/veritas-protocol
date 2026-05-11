# Changelog

All notable changes to the Tessera protocol are documented here. The protocol
follows semantic versioning at the spec level: minor versions are strictly
additive, major versions may break backward compatibility.

## v0.2.0 — 2026-05-11

### Added

- `composition_analysis` optional field on `type: "authorship"` Tesserae, enabling graduated human-vs-AI authorship breakdown with classifier transparency. See [`spec/v0.2/tessera.md` §13](spec/v0.2/tessera.md).
- New spec section **"AI Authorship Attribution Model"** explaining the graduated-truth design philosophy ([§14](spec/v0.2/tessera.md)).
- New spec section **"Version Compatibility"** stating v0.1 ⊆ v0.2 ([§15](spec/v0.2/tessera.md)).
- JSON Schema (Draft 2020-12) at [`schemas/tessera-v0.2.json`](schemas/tessera-v0.2.json).
- Companion JSON Schema for v0.1 at [`schemas/tessera-v0.1.json`](schemas/tessera-v0.1.json), reverse-engineered from `spec/v0.1/tessera.md` to enable structural validation of both versions.
- Three new conformance test vectors at [`test-vectors/v0.2/`](test-vectors/v0.2/) covering pure-human, hybrid, and mostly-AI authorship cases — each exercising every invariant in §13.3.
- New verification error code `COMPOSITION_INVARIANT_VIOLATION` for v0.2 verifiers to surface §13.3 invariant failures.

### Compatibility

- **Strictly additive.** Every v0.1 Tessera is a valid v0.2 Tessera.
- v0.2 verifiers MUST accept Tesserae with or without `composition_analysis`.
- v0.1 spec retained verbatim at [`spec/v0.1/tessera.md`](spec/v0.1/tessera.md) as a historical artifact (not modified or renamed).
- v0.1 conformance test vectors at `test-vectors/{authorship,delegation,revocation}/` are unchanged.
- The envelope `version` string may be `"tessera/v0.1"` or `"tessera/v0.2"` under the v0.2 schema. v0.2 issuers should write `"tessera/v0.2"` once their tooling supports `composition_analysis`.

### Notes

- A v0.1 verifier presented with a v0.2 Tessera will ignore `composition_analysis` per §12 (verifiers MUST ignore unknown fields). The Tessera still verifies as authentic under v0.1 rules; the v0.1 verifier simply does not surface the breakdown.

## v0.1.0 — initial release

- Tessera envelope, seven canonical types (`authorship`, `witness`, `covenant`, `delegation`, `revocation`, `attestation`, `lodestone`), four Levels of Assurance.
- Ed25519 device-key signing under JCS canonicalization (RFC 8785).
- OpenTimestamps anchoring as the default time anchor.
- 10 conformance test vectors covering authorship valid cases (LOA 2, 3, 4), authorship failure modes, delegation chain, expiration, and revocation.
