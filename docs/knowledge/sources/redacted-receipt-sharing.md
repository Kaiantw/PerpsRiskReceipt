# redacted receipt sharing

## sources checked

- EAS private data attestations: https://docs.attest.org/docs/tutorials/private-data-attestations
- EAS SDK PrivateData docs: https://github.com/ethereum-attestation-service/eas-docs-site/blob/main/docs/developer-tools/eas-sdk.md
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/
- W3C Verifiable Credentials Data Model v2.0: https://www.w3.org/TR/vc-data-model-2.0/
- W3C CCG Merkle Disclosure / JSON Web Proof note: https://w3c-ccg.github.io/Merkle-Disclosure-2021/jwp/

## takeaways

- Data minimization is the right product default for a public receipt share:
  disclose the least data needed for the review goal.
- The original snapshot hash is still useful as a stable reference, but a
  reviewer needs the hidden full snapshot to recompute that hash.
- EAS private-data and Merkle-disclosure patterns show a stronger future path
  for selective disclosure, but this slice intentionally ships a simpler
  offchain redacted JSON presentation.
- The product should be explicit about verification scope. A redacted share can
  support lightweight review, but it should not claim full snapshot
  verification, EAS attestation, or cryptographic selective disclosure.

## linked feature ideas

- [[../features/redacted-receipt-share]]
- [[../features/portable-receipt-bundle]]
- [[../features/live-receipt-recheck]]
