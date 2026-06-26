# markdown packet export

## sources checked

- MDN HTMLAnchorElement download property: https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download
- MDN URL.createObjectURL: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static
- MDN blob URLs: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- TradeZella crypto trading journal guide: https://www.tradezella.com/blog/crypto-trading-journal
- TradeBB crypto trading journal guide: https://www.tradebb.ai/blog/what-is-a-crypto-trading-journal

## takeaways

- Browser-generated markdown files can be produced client-side with a Blob,
  object URL, and anchor `download` filename, then the object URL should be
  revoked after use.
- A download button gives reviewers a durable local artifact without adding a
  backend, dependency, storage provider, wallet flow, or new data format.
- Crypto/perp review workflows benefit from records that capture funding,
  leverage, liquidation, and timestamp context because markets run continuously
  and funding can materially affect the cost of holding positions.
- A downloaded packet should preserve the same privacy boundary as the visible
  packet: full receipt packets can include private receipt context, while
  redacted packets stay inside the disclosed/public field set.
- Markdown packet downloads are communication artifacts, not hash-recomputable
  bundles or cryptographic attestations.

## linked feature ideas

- [[../features/markdown-packet-download]]
- [[../features/receipt-review-packet]]
- [[../features/redacted-review-packet]]
- [[../features/compact-redacted-risk-note]]
- [[../features/portable-receipt-bundle]]
