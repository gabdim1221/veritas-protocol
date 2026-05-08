# Contributing to the Tessera Protocol

Contributions are welcome. The protocol's design priorities, in order, are: verifiability without a central authority, privacy by default, simplicity sufficient for a competent engineer to implement in a weekend, and legal admissibility under existing electronic signature law. Proposed changes that work against these priorities are unlikely to be accepted.

## How to contribute

- **Bugs, ambiguities, clarifying questions.** Open a GitHub issue. Quote the relevant section of the spec and describe what's unclear or wrong.
- **Editorial fixes.** Open a pull request. Spelling, grammar, broken links, formatting — no RFC required.
- **Protocol changes.** Open a versioned RFC as a pull request to a new file under `spec/rfcs/`. The RFC must include: motivation, current behavior, proposed behavior, backward compatibility analysis, security implications, and at least one new conformance test vector. Changes that break v0.1 conformance ship in v0.2 or later — never as silent revisions to v0.1.
- **New test vectors.** Always welcome. Add valid and invalid vectors under `test-vectors/<type>/` with a short README describing what each vector tests.
- **New implementations.** If you build a Tessera-conformant library or product, open a pull request to add it to a forthcoming `IMPLEMENTATIONS.md`. Conformance test results required.

## Versioning

The spec is versioned with the path `spec/<version>/`. v0.1 is frozen at the moment of public release. Editorial fixes that do not change the wire format may be accepted into v0.1; anything that changes signatures, hashes, validation behavior, or required fields requires a new version.

## Licensing

By contributing you agree your contribution is licensed under the Apache 2.0 license that covers the rest of the repository.
