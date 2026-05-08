# TESSERA v0.1 — Protocol Specification

**Status.** Draft. Public revision welcomed.
**License.** Apache 2.0.
**Repository.** `github.com/veritas/veritas-protocol`.
**Reference implementation.** Veritas (`github.com/veritas/veritas-backend`, `veritas-desktop`, `veritas-extension`).

---

## 0. ABSTRACT

A Tessera is a small, signed, time-anchored JSON document that attests to a discrete human act. v0.1 defines the envelope, seven canonical Tessera types, four levels of assurance, and a cryptographic scheme for issuance and verification.

The first deployed type is `authorship` — used by the Veritas product to certify that a human authored a piece of work. Future types extend the protocol without breaking existing implementations.

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
  "version": "tessera/v0.1",
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
  if not matches_schema(tessera, "tessera/v0.1"):
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

  return VALID(loa = tessera.claim.loa,
               issued_at = tessera.claim.issued_at,
               anchored_at_block = anchor_block_time,
               author_handle = tessera.issuer.user_handle)
```

---

## 9. CONFORMANCE TEST VECTORS

The reference implementation publishes test vectors in `test-vectors/` of the protocol repository. A conformant implementation MUST verify all valid vectors as VALID and all invalid vectors with the documented failure mode.

Required vectors for v0.1 conformance:
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

---

## 10. PRIVACY CONSIDERATIONS

A Tessera MUST NOT contain raw content, raw biometric data, raw behavioral capture data, or any PII beyond what is strictly required for verification.

The `behavioral_fingerprint` field is a hash. The raw fingerprint vector is held by the issuer's client only, may be retained at the issuer's option, and is never transmitted to a verifier without the issuer's explicit release.

The `process_recording_hash` field is a hash of an encrypted blob. The plaintext recording is never transmitted as part of the Tessera. The issuer MAY release the encrypted recording to a verifier on demand; the issuer's client MUST require explicit user consent for any such release.

KYC-bound Tesserae (LOA4) reference the KYC vendor's record ID and a hash of minimized identity claims; the vendor holds the full identity record. Veritas's reference implementation does not aggregate, sell, or share KYC data.

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

## 13. INTELLECTUAL PROPERTY

This specification is licensed under Apache 2.0. The Veritas wordmark is a trademark of FRGE Nexus LLC; the Tessera protocol name and the protocol itself are not. Anyone may implement, deploy, and commercialize Tessera-conformant software without permission, subject only to the Apache 2.0 license terms.
