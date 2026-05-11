# TESSERA v0.2 — Protocol Specification

**Status.** Draft. Public revision welcomed.
**License.** Apache 2.0.
**Repository.** `github.com/gabdim1221/confirmata-protocol`.
**Reference implementation.** Confirmata (`github.com/confirmata/confirmata-backend`, `confirmata-desktop`, `confirmata-extension`).
**Supersedes.** `spec/v0.1/tessera.md` (retained as historical artifact).

---

## 0. ABSTRACT

A Tessera is a small, signed, time-anchored JSON document that attests to a discrete human act. v0.2 defines the envelope, seven canonical Tessera types, four levels of assurance, a cryptographic scheme for issuance and verification, and an **optional `composition_analysis` field** that enables capture-enabled `authorship` Tesserae to carry a graduated human-vs-AI authorship breakdown.

The first deployed type is `authorship` — used by the Confirmata product to certify that a human authored a piece of work. Future types extend the protocol without breaking existing implementations.

v0.2 is **strictly additive** over v0.1: every v0.1 Tessera is a valid v0.2 Tessera. v0.2 verifiers MUST accept Tesserae with or without `composition_analysis`. See §14 "Version Compatibility".

The protocol's design goals, in priority order: (1) **verifiability without a central authority**, (2) **privacy by default**, (3) **simplicity sufficient for a competent engineer to implement in a weekend**, (4) **legal admissibility under existing electronic signature law**.

---

## 1. TERMINOLOGY

- **Tessera.** A signed JSON document conforming to this specification. Plural: Tesserae.
- **Issuer.** The human acting through a device, signing the Tessera.
- **Subject.** The thing being attested to (a piece of content, an event, an agreement, etc.).
- **Anchor.** A cryptographic timestamp proof binding the Tessera's existence to a public clock.
- **Verifier.** Any party that checks the validity of a Tessera.
- **LOA.** Level of Assurance — the strength of the binding between the Tessera and the natural person who issued it.
- **Master key.** The Ed25519 keypair representing the user's stable identity. Generated once. Never used directly to sign content Tesserae.
- **Device key.** An Ed25519 keypair generated per device, authorized by a delegation Tessera signed by the master key.
- **Delegation Tessera.** A Tessera of type `delegation` that authorizes a device key to sign on behalf of the master key.

---

## 2. ENVELOPE

Every Tessera, regardless of type, conforms to this envelope:

```json
{
  "version": "tessera/v0.2",
  "type": "<one of: authorship | witness | covenant | delegation | revocation | attestation | lodestone>",
  "tessera_id": "<UUID v4>",
  "issuer": {
    "user_handle": "<public string>",
    "user_master_pubkey": "<base64url Ed25519 public key>",
    "device_pubkey": "<base64url Ed25519 public key>",
    "device_delegation_hash": "<sha256 hex of the delegation Tessera that authorized this device>"
  },
  "claim": {
    "loa": <integer 0-4>,
    "issued_at": "<ISO-8601 UTC timestamp>"
  },
  "type_payload": { /* type-specific schema */ },
  "biometric_attestation": {
    "method": "<webauthn | webauthn_liveness | kyc_bound | none>",
    "authenticator_data": "<base64url, when method != none>",
    "client_data_json": "<base64url, when method != none>"
  },
  "anchor": {
    "service": "<opentimestamps | rfc3161 | custom>",
    "ots_proof": "<base64 ots binary, when service = opentimestamps>",
    "anchor_uri": "<optional URI to the standalone proof file>"
  },
  "signature": {
    "algorithm": "Ed25519",
    "value": "<base64url Ed25519 signature over the canonicalized payload>"
  }
}
```

The `signature.value` is computed over the canonical serialization (RFC 8785 JSON Canonicalization Scheme) of the entire Tessera **with the `signature` object removed**. Implementations MUST use JCS exactly. Any deviation produces a different hash and a verification failure.

---

## 3. CANONICALIZATION

Tesserae use **JCS (JSON Canonicalization Scheme, RFC 8785)** for signing and hashing.

To compute the signature:
1. Build the Tessera object.
2. Remove the `signature` field.
3. Serialize using JCS rules (sorted keys, no whitespace, deterministic number serialization, UTF-8).
4. Sign the resulting bytes with the device's Ed25519 private key.
5. Insert the signature back into the Tessera.

To compute the Tessera hash (used for OpenTimestamps anchoring and for the public `short_hash`):
1. Run JCS over the **complete signed Tessera**.
2. SHA-256 the result.
3. The full hash is 64 hex characters. The short hash is the first 12 characters of the base32 encoding of the SHA-256 digest.

---

## 4. LEVELS OF ASSURANCE (LOA)

| LOA | Name | Binding | Use case |
|---|---|---|---|
| **0** | Software-only | Possession of the device key alone | System-issued Tesserae, not for personal use |
| **1** | Email-verified | Email + device key | Low-stakes personal attestations |
| **2** | Device biometric | WebAuthn passkey (Face ID, Touch ID, Windows Hello) | Default for personal authorship |
| **3** | Verified biometric | LOA2 + active liveness check (blink, head turn, randomized prompt) at signing time | Important authorship claims, multi-party covenants |
| **4** | Identity-bound | LOA3 + KYC document verification (Persona / Stripe Identity / Onfido) | Legal contracts, credentialing, real estate, regulated content |

Verifiers SHOULD reject Tesserae whose declared LOA is below their requirement. Verifiers MUST NOT treat a higher LOA as automatically including features of a lower LOA without verification — every claim is checked independently.

---

## 5. TIME ANCHORING

v0.1 uses **OpenTimestamps** as the default anchor service.

Issuance flow:
1. After signing the Tessera, the issuer's client computes its SHA-256 hash.
2. The hash is submitted to one or more OpenTimestamps calendar servers.
3. The calendar returns an upgrade-pending proof.
4. After approximately one Bitcoin block confirmation (~10 minutes to ~1 hour), the proof is upgradable to a fully-anchored proof against a Bitcoin block header.
5. The upgraded proof replaces the pending proof in the Tessera and any local copies.

A verifier MAY accept a Tessera with a pending OpenTimestamps proof, with reduced confidence, until the proof is upgradable. Verifiers SHOULD upgrade and re-verify pending proofs on a regular basis if the Tessera is being used as long-term evidence.

Alternative anchor services (RFC 3161 trusted timestamps, Sigstore Rekor, custom enterprise anchors) MAY be used by implementations that document their alternative trust assumptions.

---

## 6. DEVICE DELEGATION

A user's master key is generated once at account creation and never used directly to sign content. Instead, every device that the user adds is authorized via a delegation Tessera signed by the master key.

A `delegation` Tessera has:
```json
{
  "type": "delegation",
  "type_payload": {
    "delegated_pubkey": "<base64url device public key>",
    "device_name": "<user-friendly name>",
    "device_platform": "<macos|windows|linux|ios|android|browser_chrome|...>",
    "scope": ["sign:authorship","sign:witness"],
    "valid_from": "<ISO-8601>",
    "valid_until": "<ISO-8601 | null for no expiry>"
  }
}
```

To verify a content Tessera, a verifier MUST:
1. Verify the device signature using `issuer.device_pubkey`.
2. Fetch (or already possess) the delegation Tessera referenced by `issuer.device_delegation_hash`.
3. Verify that the delegation was signed by `issuer.user_master_pubkey`.
4. Verify that the delegated pubkey in the delegation matches `issuer.device_pubkey`.
5. Verify that the delegation has not expired and has not been revoked.
6. Verify that the delegation's `scope` permits the type of content Tessera being verified.

The delegation Tessera itself follows the same signing rules and is anchored on the OpenTimestamps clock at the moment of device authorization. This creates a tamper-evident chain: master → delegation → device → content.

---

## 7. TESSERA TYPES (v0.1)

### 7.1 `authorship`

The primary type used by Confirmata. Attests that the issuer authored the referenced content.

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

A v0.2 `authorship` Tessera MAY additionally carry a top-level `composition_analysis` object alongside (not inside) `type_payload`. The full schema, semantics, and verifier obligations are defined in §13 "Composition Analysis". `composition_analysis` is OPTIONAL; v0.1-style authorship Tesserae without it remain fully valid under v0.2.

### 7.2 `witness`

Attests that the issuer observed an event or fact at the issued time.

```json
"type_payload": {
  "observation": "<free text or structured claim>",
  "subject_hash": "<optional sha256 of an observed artifact>",
  "location": { "latitude": <float>, "longitude": <float>, "accuracy_m": <float> }
}
```

### 7.3 `covenant`

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

### 7.4 `delegation`

See section 6.

### 7.5 `revocation`

Revokes a previously-issued Tessera. The revocation Tessera itself is anchored, providing tamper-evident proof of when revocation occurred.

```json
"type_payload": {
  "revoked_tessera_hash": "<sha256 hex of the Tessera being revoked>",
  "reason": "<compromised | mistake | retracted | superseded | other>",
  "reason_text": "<optional free text>"
}
```

### 7.6 `attestation`

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

### 7.7 `lodestone`

A long-running preference signal — used to record a stable opinion, vote, or stance over time. Lower-stakes than other types; LOA0 or LOA1 sufficient.

```json
"type_payload": {
  "topic": "<string identifier>",
  "stance": "<free text or structured claim>",
  "supersedes": "<optional sha256 of prior lodestone Tessera on the same topic>"
}
```

---

## 8. VERIFICATION ALGORITHM

Pseudocode for a complete verification of an `authorship` Tessera:

```
function verify(tessera):
  # 1. Schema validation
  if not matches_schema(tessera, "tessera/v0.2"):
    return INVALID_SCHEMA

  # 2. Canonicalize and verify signature
  canonical_bytes = JCS(tessera without signature)
  if not Ed25519.verify(
      signature = tessera.signature.value,
      message = canonical_bytes,
      pubkey = tessera.issuer.device_pubkey):
    return INVALID_SIGNATURE

  # 3. Verify device delegation chain
  delegation = fetch_delegation(tessera.issuer.device_delegation_hash)
  if delegation is None:
    return DELEGATION_NOT_FOUND
  if not Ed25519.verify(
      signature = delegation.signature.value,
      message = JCS(delegation without signature),
      pubkey = tessera.issuer.user_master_pubkey):
    return INVALID_DELEGATION_SIGNATURE
  if delegation.type_payload.delegated_pubkey != tessera.issuer.device_pubkey:
    return DELEGATION_KEY_MISMATCH
  if not within_validity_window(delegation, tessera.claim.issued_at):
    return DELEGATION_EXPIRED
  if delegation_revoked(delegation.tessera_id):
    return DELEGATION_REVOKED

  # 4. Verify time anchor
  tessera_hash = SHA256(JCS(tessera))
  if tessera.anchor.service == "opentimestamps":
    if not OpenTimestamps.verify(tessera.anchor.ots_proof, tessera_hash):
      return INVALID_ANCHOR
    anchor_block_time = OpenTimestamps.get_block_time(tessera.anchor.ots_proof)
    if abs(anchor_block_time - tessera.claim.issued_at) > MAX_CLOCK_SKEW:
      return ANCHOR_TIME_MISMATCH

  # 5. Check revocation
  if certificate_revoked(tessera_hash):
    return REVOKED

  # 6. Optional: verify content hash matches actual content
  if verify_content_provided:
    actual_hash = SHA256(content_bytes)
    if actual_hash != tessera.type_payload.subject.content_hash:
      return CONTENT_MISMATCH

  # 7. LOA check
  if required_loa > tessera.claim.loa:
    return LOA_INSUFFICIENT

  # 8. Composition analysis invariants (v0.2, when present)
  if tessera.composition_analysis is not None:
    if not check_composition_invariants(tessera.composition_analysis):
      return COMPOSITION_INVARIANT_VIOLATION

  return VALID(loa = tessera.claim.loa,
               issued_at = tessera.claim.issued_at,
               anchored_at_block = anchor_block_time,
               author_handle = tessera.issuer.user_handle,
               composition = tessera.composition_analysis)  # may be None
```

`check_composition_invariants` is defined in §13. A v0.2 verifier MUST accept a Tessera whose `composition_analysis` is absent (v0.1 issuers and capture-disabled v0.2 issuers).

---

## 9. CONFORMANCE TEST VECTORS

The reference implementation publishes test vectors in `test-vectors/` of the protocol repository. A conformant implementation MUST verify all valid vectors as VALID and all invalid vectors with the documented failure mode.

Required vectors for v0.2 conformance — **all 10 v0.1 vectors plus 3 new v0.2 vectors**:

v0.1 carry-forward (binding behavior unchanged under v0.2):
- `authorship/valid-loa2.json`
- `authorship/valid-loa3.json`
- `authorship/valid-loa4.json`
- `authorship/invalid-bad-signature.json`
- `authorship/invalid-bad-anchor.json`
- `authorship/invalid-revoked.json`
- `authorship/invalid-content-mismatch.json`
- `delegation/valid-chain.json`
- `delegation/invalid-expired.json`
- `revocation/valid.json`

New for v0.2 (`composition_analysis` exercise):
- `v0.2/composition_pure_human.json` — VALID, ~95% human, 0% AI, confidence high
- `v0.2/composition_hybrid.json` — VALID, ~70% human, 22% AI, 8% ambiguous, confidence high
- `v0.2/composition_mostly_ai.json` — VALID, ~28% human, 65% AI, 7% ambiguous, confidence medium

---

## 10. PRIVACY CONSIDERATIONS

A Tessera MUST NOT contain raw content, raw biometric data, raw behavioral capture data, or any PII beyond what is strictly required for verification.

The `behavioral_fingerprint` field is a hash. The raw fingerprint vector is held by the issuer's client only, may be retained at the issuer's option, and is never transmitted to a verifier without the issuer's explicit release.

The `process_recording_hash` field is a hash of an encrypted blob. The plaintext recording is never transmitted as part of the Tessera. The issuer MAY release the encrypted recording to a verifier on demand; the issuer's client MUST require explicit user consent for any such release.

KYC-bound Tesserae (LOA4) reference the KYC vendor's record ID and a hash of minimized identity claims; the vendor holds the full identity record. Confirmata's reference implementation does not aggregate, sell, or share KYC data.

---

## 11. SECURITY CONSIDERATIONS

**Key compromise.** If a device key is compromised, the user revokes the delegation Tessera. All Tesserae signed by that device after the revocation timestamp are considered invalid; Tesserae signed before the revocation remain valid because the OpenTimestamps anchor proves they pre-date the compromise.

**Master key compromise.** Catastrophic. The user MUST be able to publish a master-key revocation through an out-of-band channel (e.g. signed by a recovery key, social recovery, or a paper recovery code held offline). The protocol provides for `master_revocation` Tesserae but specifies that recovery infrastructure is implementation-defined.

**Anchor service compromise.** OpenTimestamps' security depends on Bitcoin. A successful attack on Bitcoin's chain ordering would invalidate anchors created during the attack window. Multi-anchor strategies (publishing the same hash to multiple independent anchor services) are RECOMMENDED for high-value Tesserae.

**Replay.** Tesserae are bound to specific content via `content_hash`. A replay attack requires producing the same content, which is acceptable — the Tessera correctly attests that the content existed at the anchored time.

**Behavioral fingerprint spoofing.** Sufficiently advanced AI may be able to mimic human typing patterns. The behavioral fingerprint is one of three trust layers, not the primary one. The biometric attestation and the secure-hardware-bound device key are the primary anchors. Behavioral fingerprinting is defense-in-depth, useful for detecting anomalies but not the basis of trust.

---

## 12. EXTENSION POINTS

The protocol is intentionally minimal. Future versions may add:
- Multi-party signing (already supported via `covenant`, but with richer threshold schemes).
- Zero-knowledge selective disclosure (proving LOA without revealing identity).
- Decentralized identity integration (DID-based `user_master_pubkey`).
- Post-quantum signature algorithms once stabilized.
- Additional Tessera types as use cases emerge.

Implementations MAY include additional fields in any object as long as the canonicalization and signing rules are preserved. Verifiers MUST ignore unknown fields rather than reject the Tessera.

---

## 13. COMPOSITION ANALYSIS (v0.2)

`composition_analysis` is an **optional**, top-level field on `authorship` Tesserae (sibling of `type_payload`, not nested inside it). When present, it carries a graduated breakdown of how the issuer's authorship session was spent — time-bucketed into human, AI-assisted, voice, paste, review, and idle states — together with issuer-computed authorship percentages and a self-described classifier identity.

The intent is to move the ecosystem off the binary "human vs. AI" verdict, toward a transparent, policy-evaluable measurement that downstream verifiers (publications, universities, employers) can apply against their own thresholds.

### 13.1 Schema

```json
{
  "composition_analysis": {
    "version": "1",
    "total_session_ms": 3600000,
    "buckets": {
      "human_active_ms": 2200000,
      "ai_assisted_ms": 540000,
      "voice_authored_ms": 360000,
      "paste_inserted_ms": 180000,
      "context_review_ms": 540000,
      "idle_ms": 180000
    },
    "computed_authorship": {
      "human_pct": 71.4,
      "ai_assisted_pct": 15.0,
      "ambiguous_pct": 5.0,
      "confidence": "high"
    },
    "classification_method": "confirmata_classifier_v1.0",
    "policy_eligible_categories": ["academic_70_plus", "journalism_60_plus"]
  }
}
```

### 13.2 Field semantics

- **`version`** (string, required if `composition_analysis` is present): Version of the composition analysis sub-schema. Currently `"1"`. Permits future extension without bumping the full Tessera version.
- **`total_session_ms`** (integer, required, > 0): Total wall-clock duration of the authorship session, in milliseconds.
- **`buckets`** (object, required): Time spent in each classified state. All six fields are required.
  - `human_active_ms`: Time with hardware keyboard/mouse input correlating to screen changes. Pure human work.
  - `ai_assisted_ms`: Time with significant editor text insertion via synthetic events or known AI-tool processes, with little or no human input.
  - `voice_authored_ms`: Time with speech detected in audio AND text appearing in the editor with timing aligned to speech cadence. **Counts toward human authorship.**
  - `paste_inserted_ms`: Time during which clipboard paste events produced screen changes. Neither human nor AI authorship; treated as ambiguous quotation/insertion.
  - `context_review_ms`: Time with screen activity in non-editor regions (reading, researching, browsing) without editor text insertion. Session time, but not authorship time.
  - `idle_ms`: Time with no meaningful activity in any modality.
- **`computed_authorship`** (object, required): Issuer-computed percentages.
  - `human_pct` (number, 0–100): `(human_active_ms + voice_authored_ms) / authorship_time × 100`, where `authorship_time = total_session_ms − context_review_ms − idle_ms`.
  - `ai_assisted_pct` (number, 0–100): `ai_assisted_ms / authorship_time × 100`.
  - `ambiguous_pct` (number, 0–100): `paste_inserted_ms / authorship_time × 100`.
  - `confidence` (enum, required): `"high" | "medium" | "low"`. Reflects classifier confidence across the session.
- **`classification_method`** (string, required): Format `{vendor}_classifier_v{major}.{minor}` (regex: `^[a-z_]+_classifier_v\d+\.\d+$`). The Confirmata reference classifier identifies as `confirmata_classifier_v1.0`. Other implementations MUST use their own identifiers so verifiers can tell classifiers apart.
- **`policy_eligible_categories`** (array of strings, optional): Tags indicating which policy thresholds this Tessera satisfies. Free-form strings; the ecosystem will standardize tags over time. Examples: `"academic_70_plus"`, `"journalism_60_plus"`, `"creative_writing_50_plus"`.

### 13.3 Invariants

A valid v0.2 Tessera that carries `composition_analysis` MUST satisfy ALL of the following:

1. **Bucket sum.** `human_active_ms + ai_assisted_ms + voice_authored_ms + paste_inserted_ms + context_review_ms + idle_ms` equals `total_session_ms` within ±100ms tolerance for rounding.
2. **Authorship percentage sum.** `human_pct + ai_assisted_pct + ambiguous_pct` is between 99.0 and 101.0 inclusive (rounding tolerance).
3. **Non-negativity.** All `_ms` fields are ≥ 0. All `_pct` fields are in [0, 100].
4. **Authorship time minimum.** If `total_session_ms − context_review_ms − idle_ms < 1000` ms, `composition_analysis` MUST be omitted entirely. Sessions too short to meaningfully classify do not carry the field.
5. **Voice authorship classification.** `voice_authored_ms` counts toward `human_pct`, never toward `ai_assisted_pct`. Voice dictation is human authorship.
6. **No partial population.** If `composition_analysis` is present, every required sub-field MUST be present. Partial population is invalid.

### 13.4 Verification semantics

A v0.2 verifier MUST:

- Accept Tesserae **without** `composition_analysis` (legacy v0.1 issuers, or capture-disabled v0.2 issuers).
- When `composition_analysis` is present: validate invariants 1–6.
- Reject Tesserae where invariants fail with explicit error code `COMPOSITION_INVARIANT_VIOLATION`.
- Surface the breakdown (buckets, percentages, classifier identity, eligible categories) to the verifying party (UI, API response, etc.).

A v0.2 issuer MUST:

- Include `composition_analysis` only if the session was captured with a classifier of stated identity.
- Omit `composition_analysis` entirely (not `null`, not an empty object) when no classifier was used.

### 13.5 Canonicalization note

`composition_analysis` participates in the same JCS canonicalization rule (§3) as every other field: it is included in the bytes that are signed, and its presence changes the signature. There is no separate signing step.

---

## 14. AI AUTHORSHIP ATTRIBUTION MODEL

The protocol intentionally rejects the binary "human or AI" framing.

**Graduated truth over binary verdicts.** Authorship today is almost never one-or-the-other. A writer types a draft, asks an LLM to rewrite a paragraph, dictates a paragraph back, pastes a quotation, edits the whole thing by hand. Each of those modalities leaves a different signal. The classifier's job is to measure them, not to issue a verdict. `composition_analysis` exposes those measurements directly.

**Classifier transparency.** Every `composition_analysis` block declares the `classification_method` that produced it. The classifier is a named, versioned third party — Confirmata's reference classifier identifies as `confirmata_classifier_v1.0`; other implementations will name themselves. Verifiers can choose which classifiers they trust. This puts the trust burden where it belongs: on the classifier, not on the protocol.

**Verifier-side policy enforcement.** The protocol does not say "70% human is acceptable" or "anything over 50% AI is rejected." It says: here are the numbers, here are the tags the issuer claims they satisfy, you decide. A university may require `academic_70_plus`. A newsroom may require `journalism_60_plus`. A creative platform may not care. The protocol is the substrate; policy lives at the verifier.

**Why this matters.** A binary verdict invites adversarial gaming: any system that returns "this was written by AI" or "this was written by a human" can be circumvented by a tool that crosses the threshold. A measurement-and-transparency model survives: the buckets are anchored to what actually happened on the device, the classifier is named, and the threshold is set by the party that has skin in the game (the verifier), not by the protocol.

The voice-authorship rule (invariant 5) is the model's anchor case. A novelist who dictates 100% of her book is not an AI-assisted author. Treating speech-cadence-aligned text as human authorship enforces this — and rules out a class of false positives that would otherwise discriminate against accessibility-driven workflows.

---

## 15. VERSION COMPATIBILITY

**v0.2 is strictly additive over v0.1.**

- Every v0.1 Tessera is a valid v0.2 Tessera. No v0.1 field changes shape, type, or semantics.
- A v0.2 issuer MAY include `composition_analysis`. A v0.2 issuer MAY omit it. Both modes are conformant.
- A v0.2 verifier MUST accept Tesserae with or without `composition_analysis`.
- A v0.1 verifier presented with a v0.2 Tessera will ignore `composition_analysis` (per §12 "verifiers MUST ignore unknown fields") and verify the Tessera under v0.1 rules. This is the intended forward-compatibility behavior; v0.1 verifiers do not get the breakdown but the Tessera still verifies as authentic.
- The envelope `version` string is `"tessera/v0.2"` for new Tesserae issued under this spec. Tesserae with `version: "tessera/v0.1"` remain valid indefinitely; issuers SHOULD migrate to `"tessera/v0.2"` once their tooling supports `composition_analysis`, but the migration is not required.
- The v0.1 spec (`spec/v0.1/tessera.md`) and v0.1 JSON Schema (`schemas/tessera-v0.1.json`) are preserved unchanged.

---

## 16. INTELLECTUAL PROPERTY

This specification is licensed under Apache 2.0. The Confirmata wordmark is a trademark of FRGE Nexus LLC; the Tessera protocol name and the protocol itself are not. Anyone may implement, deploy, and commercialize Tessera-conformant software without permission, subject only to the Apache 2.0 license terms.
