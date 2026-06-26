# compact redacted risk note

## sources checked

- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/
- W3C privacy principles: https://www.w3.org/TR/privacy-principles/
- Coinbase liquidation strategies for perpetual futures: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- MetaMask perpetual futures liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics
- Binance trading journal guide: https://www.binance.com/en/academy/articles/what-is-a-trading-journal-and-how-to-use-one
- CME position and risk management: https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management

## takeaways

- A compact public note should disclose only the fields needed for quick review:
  risk label, timestamp, hash reference, bucketed exposure, loaded-context state,
  review thresholds, and capped review cues.
- Current-market value comes from whether liquidation buffer, funding, volatility,
  public trend, and freshness cues make the saved share worth deeper review.
- The compact note should preserve the original snapshot hash as a reference, but
  must say the hidden full snapshot is still required for recomputation.
- A short note is useful for issue comments, social proof, or quick reviewer
  handoff; the full redacted packet remains the better artifact when row-level
  details are needed.
- The note must stay descriptive: no trading instructions, no official protocol
  risk claim, and no implication that a stale snapshot became live.

## linked feature ideas

- [[../features/compact-redacted-risk-note]]
- [[../features/redacted-review-packet]]
- [[../features/redacted-review-thresholds]]
- [[../features/redacted-freshness-verdict]]
- [[../features/redacted-snapshot-comparison]]
