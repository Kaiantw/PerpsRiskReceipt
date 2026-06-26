# redacted review packet

## sources checked

- EAS private data attestations: https://docs.attest.org/docs/tutorials/private-data-attestations
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/
- W3C Verifiable Credentials Data Model v2.0: https://www.w3.org/TR/vc-data-model-2.0/
- W3C CCG Merkle Disclosure note: https://w3c-ccg.github.io/Merkle-Disclosure-2021/
- Chainlink blockchain privacy overview: https://chain.link/article/blockchain-privacy-data-confidentiality

## takeaways

- Public receipt sharing should follow data minimization: disclose only the
  fields needed for the review goal.
- Selective disclosure and private-data attestation patterns are stronger future
  proof systems, but this packet is intentionally a simple redacted markdown
  communication artifact.
- A redacted packet should preserve the snapshot hash as a reference while
  clearly saying it cannot recompute or verify the hidden full snapshot.
- Public market context can make a redacted share more useful, but it should not
  imply access to hidden saved marks, account equity, exact size, PnL, or
  trading intent.
- Blockchain transparency makes privacy boundaries important for financial data;
  the packet should be explicit about what is hidden and why.

## linked feature ideas

- [[../features/redacted-review-packet]]
- [[../features/redacted-receipt-share]]
- [[../features/redacted-market-watchlist]]
- [[../features/redacted-share-assistant]]
- [[../features/receipt-review-packet]]
