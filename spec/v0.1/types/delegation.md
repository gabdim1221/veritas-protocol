# Tessera type: `delegation`

> This file is a per-type extract from the canonical specification at [`spec/v0.1/tessera.md`](../tessera.md). For the full envelope, canonicalization rules, time anchoring, and verification algorithm, read the canonical spec. This extract exists for navigation and for implementers building support for a single type.

A user's master key is generated once at account creation and never used directly to sign content. Instead, every device that the user adds is authorized via a delegation Tessera signed by the master key.

```json
"type_payload": {
  "delegated_pubkey": "<base64url device public key>",
  "device_name": "<user-friendly name>",
  "device_platform": "<macos|windows|linux|ios|android|browser_chrome|...>",
  "scope": ["sign:authorship","sign:witness"],
  "valid_from": "<ISO-8601>",
  "valid_until": "<ISO-8601 | null for no expiry>"
}
```

## Verification of the delegation chain

To verify a content Tessera, a verifier MUST:

1. Verify the device signature using `issuer.device_pubkey`.
2. Fetch (or already possess) the delegation Tessera referenced by `issuer.device_delegation_hash`.
3. Verify that the delegation was signed by `issuer.user_master_pubkey`.
4. Verify that the delegated pubkey in the delegation matches `issuer.device_pubkey`.
5. Verify that the delegation has not expired and has not been revoked.
6. Verify that the delegation's `scope` permits the type of content Tessera being verified.

The delegation Tessera itself follows the same signing rules and is anchored on the OpenTimestamps clock at the moment of device authorization. This creates a tamper-evident chain: master → delegation → device → content.

## Special case: signing the delegation itself

Delegation Tesserae are the only Tesserae signed by the master key directly. For these, `issuer.device_pubkey` equals `issuer.user_master_pubkey` and `issuer.device_delegation_hash` MAY be the empty string (since there is no prior delegation — this is the bootstrap).

## Compromise

If a device key is compromised, the user issues a `revocation` Tessera referencing the delegation. Tesserae signed by that device after the revocation timestamp are invalid; Tesserae signed before the revocation remain valid because the OpenTimestamps anchor proves they pre-date the compromise.
