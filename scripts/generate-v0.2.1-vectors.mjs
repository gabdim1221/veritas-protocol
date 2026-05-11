#!/usr/bin/env node
/**
 * Generate the three v0.2.1 paste-forensics test vectors. Self-contained
 * within the confirmata-protocol repo (no dependency on confirmata-verifier
 * per the v0.2.1 amendment prompt's "only confirmata-protocol is touched"
 * invariant). Uses the same deterministic alice identity as the v0.2
 * composition vectors so verifiers can chain across versions seamlessly.
 *
 * Run:
 *   node scripts/generate-v0.2.1-vectors.mjs
 *
 * Writes:
 *   test-vectors/v0.2.1/paste_forensics_ai_heavy.json
 *   test-vectors/v0.2.1/paste_forensics_research_heavy.json
 *   test-vectors/v0.2.1/paste_forensics_empty.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import * as ed from "@noble/ed25519";
import canonicalize from "canonicalize";

// @noble/ed25519 v2.x requires the host to provide a synchronous sha512.
ed.etc.sha512Sync = (...messages) => {
  const total = messages.reduce((acc, m) => acc + m.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const m of messages) {
    buf.set(m, offset);
    offset += m.length;
  }
  return sha512(buf);
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "test-vectors", "v0.2.1");
mkdirSync(OUT, { recursive: true });

// ---- helpers ----

const b64url = (bytes) =>
  Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const hex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

function deterministicKey(label) {
  // Same derivation the v0.2 generator used so the alice identity is
  // bit-identical to the existing test-vectors/v0.2/composition_* vectors.
  return sha256(new TextEncoder().encode(`confirmata/v0.1/test-vectors/${label}`));
}

function detKeypair(label) {
  const privateKey = deterministicKey(label);
  const publicKey = ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

const masterKp = detKeypair("master");
const deviceKp = detKeypair("device");
const masterPub = b64url(masterKp.publicKey);
const devicePub = b64url(deviceKp.publicKey);

const STUB_PROOF = b64url(new Uint8Array(64).fill(0xab));

function canonicalizeForSigning(tessera) {
  // Spec §3 (extended in v0.2.1): strip the entire `signature` object plus
  // the late-added anchor fields (anchor.ots_proof, anchor.anchor_uri)
  // before JCS canonicalization.
  const copy = JSON.parse(JSON.stringify(tessera));
  delete copy.signature;
  if (copy.anchor && typeof copy.anchor === "object") {
    delete copy.anchor.ots_proof;
    delete copy.anchor.anchor_uri;
  }
  const c = canonicalize(copy);
  if (c === undefined) throw new Error("JCS returned undefined");
  return new TextEncoder().encode(c);
}

function tesseraHash(tessera) {
  const copy = JSON.parse(JSON.stringify(tessera));
  if (copy.anchor && typeof copy.anchor === "object") {
    delete copy.anchor.ots_proof;
    delete copy.anchor.anchor_uri;
  }
  const c = canonicalize(copy);
  if (c === undefined) throw new Error("JCS returned undefined");
  return sha256(new TextEncoder().encode(c));
}

function sign(envelope, privateKey) {
  const msg = canonicalizeForSigning(envelope);
  const sig = ed.sign(msg, privateKey);
  const out = JSON.parse(JSON.stringify(envelope));
  out.signature = { algorithm: "Ed25519", value: b64url(sig) };
  out.anchor.ots_proof = STUB_PROOF;
  return out;
}

// ---- envelopes ----

// Same DELEGATION the v0.2 composition vectors use — built the same way so
// the delegation_tessera_hash matches across versions.
const DELEGATION_VALID_FROM = "2026-05-08T17:00:00.000Z";
const DELEGATION_FAR_FUTURE = "2099-01-01T00:00:00.000Z";

function buildDelegation() {
  const draft = {
    version: "tessera/v0.1",
    type: "delegation",
    tessera_id: "11111111-1111-4111-8111-111111111111",
    issuer: {
      user_handle: "alice",
      user_master_pubkey: masterPub,
      device_pubkey: masterPub,
      device_delegation_hash: "",
    },
    claim: { loa: 0, issued_at: DELEGATION_VALID_FROM },
    type_payload: {
      delegated_pubkey: devicePub,
      device_name: "alice-test-device",
      device_platform: "test",
      scope: ["sign:authorship", "sign:revocation"],
      valid_from: DELEGATION_VALID_FROM,
      valid_until: DELEGATION_FAR_FUTURE,
    },
    biometric_attestation: { method: "none" },
    anchor: { service: "opentimestamps" },
    signature: { algorithm: "Ed25519", value: "" },
  };
  return sign(draft, masterKp.privateKey);
}

const VALID_DELEGATION = buildDelegation();
const DELEGATION_HASH = hex(tesseraHash(VALID_DELEGATION));

if (DELEGATION_HASH !== "a46fdd274445e62bad2538cd0c39bbedf770213f36947c5fe87db1c5cb6c8ebc") {
  throw new Error(
    `delegation hash drift: got ${DELEGATION_HASH}, expected the v0.2 alice hash. ` +
      `The @noble/ed25519 or @noble/hashes versions have changed the deterministic ` +
      `key derivation, breaking v0.2 ↔ v0.2.1 alice continuity. Investigate before proceeding.`,
  );
}

function buildAuthorship({ uuid, loa, biometric, contentString, sessionStartedAt, sessionEndedAt, durationMs, aiDisclosure, composition }) {
  const contentBytes = new TextEncoder().encode(contentString);
  const contentHash = hex(sha256(contentBytes));
  const draft = {
    version: "tessera/v0.2.1",
    type: "authorship",
    tessera_id: uuid,
    issuer: {
      user_handle: "alice",
      user_master_pubkey: masterPub,
      device_pubkey: devicePub,
      device_delegation_hash: DELEGATION_HASH,
    },
    claim: { loa, issued_at: sessionStartedAt },
    type_payload: {
      subject: {
        content_hash: contentHash,
        content_size_bytes: contentBytes.length,
        content_mime: "text/plain",
        content_filename: "conformance.txt",
      },
      session: {
        started_at: sessionStartedAt,
        ended_at: sessionEndedAt,
        duration_ms: durationMs,
        tools_used: ["confirmata-conformance@v0.2.1"],
      },
      behavioral_fingerprint: b64url(sha256(contentBytes)),
      ai_assistance_disclosure: aiDisclosure,
    },
    biometric_attestation:
      biometric === "none"
        ? { method: "none" }
        : {
            method: biometric,
            authenticator_data: b64url(new Uint8Array(32).fill(0xcc)),
            client_data_json: b64url(new Uint8Array(64).fill(0xdd)),
          },
    anchor: { service: "opentimestamps" },
    composition_analysis: composition,
    signature: { algorithm: "Ed25519", value: "" },
  };
  return sign(draft, deviceKp.privateKey);
}

// ---- composition payloads ----

// (1) paste_forensics_ai_heavy — 45 min, skewed ai_assisted_ms
//     buckets sum exactly to 2_700_000; pct sum exactly 100.0
const AI_HEAVY = {
  version: "1",
  total_session_ms: 2_700_000,
  buckets: {
    human_active_ms: 500_000,
    ai_assisted_ms: 1_400_000,
    voice_authored_ms: 0,
    paste_inserted_ms: 400_000,
    context_review_ms: 200_000,
    idle_ms: 200_000,
  },
  // authorship_time = 2_300_000
  // human_pct  = (500_000 + 0)        / 2_300_000 = 0.21739... → 21.7
  // ai_pct     = 1_400_000            / 2_300_000 = 0.60869... → 60.9
  // ambig_pct  = 400_000              / 2_300_000 = 0.17391... → 17.4
  // sum = 100.0
  computed_authorship: {
    human_pct: 21.7,
    ai_assisted_pct: 60.9,
    ambiguous_pct: 17.4,
    confidence: "high",
  },
  classification_method: "confirmata_classifier_v1.0",
  policy_eligible_categories: [],
  paste_events: [
    {
      timestamp_ms: 300_000,
      size_chars: 820,
      source_classification: "ai_tool",
      source_evidence: "chrome:chat.openai.com",
      confidence: "high",
      contributed_to_bucket: "ai_assisted_ms",
    },
    {
      timestamp_ms: 900_000,
      size_chars: 450,
      source_classification: "research_quotation",
      source_evidence: "chrome:en.wikipedia.org",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 1_500_000,
      size_chars: 1_240,
      source_classification: "ai_tool",
      source_evidence: "chrome:chat.openai.com",
      confidence: "high",
      contributed_to_bucket: "ai_assisted_ms",
    },
    {
      timestamp_ms: 2_100_000,
      size_chars: 180,
      source_classification: "internal_authored",
      source_evidence: "app:com.apple.Notes",
      confidence: "medium",
      contributed_to_bucket: "paste_inserted_ms",
    },
  ],
};

// (2) paste_forensics_research_heavy — 90 min, high human, zero ai
const RESEARCH_HEAVY = {
  version: "1",
  total_session_ms: 5_400_000,
  buckets: {
    human_active_ms: 4_000_000,
    ai_assisted_ms: 0,
    voice_authored_ms: 100_000,
    paste_inserted_ms: 400_000,
    context_review_ms: 600_000,
    idle_ms: 300_000,
  },
  // authorship_time = 4_500_000
  // human_pct  = (4_000_000 + 100_000) / 4_500_000 = 0.91111... → 91.1
  // ai_pct     = 0                     / 4_500_000 = 0.0
  // ambig_pct  = 400_000               / 4_500_000 = 0.08888... → 8.9
  // sum = 100.0
  computed_authorship: {
    human_pct: 91.1,
    ai_assisted_pct: 0.0,
    ambiguous_pct: 8.9,
    confidence: "high",
  },
  classification_method: "confirmata_classifier_v1.0",
  policy_eligible_categories: [
    "academic_70_plus",
    "journalism_60_plus",
    "creative_writing_50_plus",
  ],
  paste_events: [
    {
      timestamp_ms: 600_000,
      size_chars: 380,
      source_classification: "research_quotation",
      source_evidence: "chrome:arxiv.org",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 1_200_000,
      size_chars: 220,
      source_classification: "research_quotation",
      source_evidence: "chrome:en.wikipedia.org",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 1_950_000,
      size_chars: 510,
      source_classification: "research_quotation",
      source_evidence: "chrome:arxiv.org",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 2_640_000,
      size_chars: 145,
      source_classification: "research_quotation",
      source_evidence: "chrome:en.wikipedia.org",
      confidence: "medium",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 3_400_000,
      size_chars: 690,
      source_classification: "research_quotation",
      source_evidence: "chrome:arxiv.org",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
    {
      timestamp_ms: 4_500_000,
      size_chars: 95,
      source_classification: "internal_authored",
      source_evidence: "app:com.microsoft.Word",
      confidence: "high",
      contributed_to_bucket: "paste_inserted_ms",
    },
  ],
};

// (3) paste_forensics_empty — 30 min, pure keyboard, paste_events: []
const EMPTY_PASTE = {
  version: "1",
  total_session_ms: 1_800_000,
  buckets: {
    human_active_ms: 1_680_000,
    ai_assisted_ms: 0,
    voice_authored_ms: 0,
    paste_inserted_ms: 0,
    context_review_ms: 60_000,
    idle_ms: 60_000,
  },
  // authorship_time = 1_680_000
  // human_pct  = 1_680_000 / 1_680_000 = 1.0 → 100.0
  // ai_pct     = 0
  // ambig_pct  = 0
  // sum = 100.0
  computed_authorship: {
    human_pct: 100.0,
    ai_assisted_pct: 0.0,
    ambiguous_pct: 0.0,
    confidence: "high",
  },
  classification_method: "confirmata_classifier_v1.0",
  policy_eligible_categories: [
    "academic_70_plus",
    "journalism_60_plus",
    "creative_writing_50_plus",
  ],
  paste_events: [],
};

// ---- assemble + write ----

const COMPOSITION_ISSUED_AT = "2026-05-08T19:00:00.000Z";

function withSession(totalMs) {
  const start = new Date(COMPOSITION_ISSUED_AT);
  const end = new Date(start.getTime() + totalMs);
  return { startedAt: start.toISOString(), endedAt: end.toISOString(), durationMs: totalMs };
}

function bundle(description, tessera) {
  return { description, tessera, delegation: VALID_DELEGATION };
}

const AI_T = withSession(AI_HEAVY.total_session_ms);
const RES_T = withSession(RESEARCH_HEAVY.total_session_ms);
const EMPTY_T = withSession(EMPTY_PASTE.total_session_ms);

const AI_TESSERA = buildAuthorship({
  uuid: "dddd1111-1111-4111-8111-dddddddddddd",
  loa: 3,
  biometric: "webauthn_liveness",
  contentString: "a forty-five-minute session that leaned on chatgpt for drafting\n",
  sessionStartedAt: AI_T.startedAt,
  sessionEndedAt: AI_T.endedAt,
  durationMs: AI_T.durationMs,
  aiDisclosure: "generation",
  composition: AI_HEAVY,
});

const RES_TESSERA = buildAuthorship({
  uuid: "dddd2222-2222-4222-8222-dddddddddddd",
  loa: 3,
  biometric: "webauthn_liveness",
  contentString: "a ninety-minute academic writing session with many quoted sources\n",
  sessionStartedAt: RES_T.startedAt,
  sessionEndedAt: RES_T.endedAt,
  durationMs: RES_T.durationMs,
  aiDisclosure: "research",
  composition: RESEARCH_HEAVY,
});

const EMPTY_TESSERA = buildAuthorship({
  uuid: "dddd3333-3333-4333-8333-dddddddddddd",
  loa: 3,
  biometric: "webauthn_liveness",
  contentString: "a thirty-minute pure-keyboard session with zero paste events\n",
  sessionStartedAt: EMPTY_T.startedAt,
  sessionEndedAt: EMPTY_T.endedAt,
  durationMs: EMPTY_T.durationMs,
  aiDisclosure: "none",
  composition: EMPTY_PASTE,
});

function writeJson(name, value) {
  writeFileSync(resolve(OUT, name), JSON.stringify(value, null, 2) + "\n");
}

writeJson(
  "paste_forensics_ai_heavy.json",
  bundle(
    "v0.2.1 paste_events: 45-min session, ~22% human / 61% AI / 17% ambiguous. 4 paste events — 2 ChatGPT (ai_tool), 1 Wikipedia (research_quotation), 1 Apple Notes (internal_authored). Verifier policy that bans ai_tool pastes can reject this even though buckets technically satisfy a permissive threshold.",
    AI_TESSERA,
  ),
);
writeJson(
  "paste_forensics_research_heavy.json",
  bundle(
    "v0.2.1 paste_events: 90-min academic session, ~91% human / 0% AI / 9% ambiguous. 6 paste events — 5 research_quotation (arxiv + Wikipedia), 1 internal_authored (own Word draft). Demonstrates legitimate quotation-heavy authorship; satisfies academic_70_plus and creative_writing_50_plus.",
    RES_TESSERA,
  ),
);
writeJson(
  "paste_forensics_empty.json",
  bundle(
    "v0.2.1 paste_events: 30-min pure-keyboard session, 100% human authorship. paste_events: [] exercises the empty-array path — the verifier MUST accept this as valid (invariant 1).",
    EMPTY_TESSERA,
  ),
);

console.log(
  `✓ wrote 3 v0.2.1 paste-forensics vectors under ${OUT}/ (alice identity matches v0.2; delegation hash ${DELEGATION_HASH})`,
);
