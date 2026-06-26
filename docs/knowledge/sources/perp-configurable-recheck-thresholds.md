# perp configurable recheck thresholds

## source-backed notes

- Hyperliquid's liquidation, funding, and mark-price docs support using listed
  liquidation distance, mark movement, and funding as current-market receipt
  review inputs.
- Coinbase's liquidation and funding explainers support framing liquidation
  buffer and funding cost as things to review before treating a position
  snapshot as current.
- CME's open-interest education supports treating open interest as participation
  context, not a standalone direction signal.

## product assumptions

- Thresholds are review sensitivity settings only. They do not change the risk
  engine, saved receipt, receipt hash, live adapter, or normalized data model.
- The same active thresholds should drive the visible recheck watchlist and the
  copyable review packet so copied context matches what the reviewer saw.
- Default thresholds stay intentionally conservative and transparent:
  500 bps thin listed buffer, 1000 bps tight listed buffer, 2 percent adverse
  mark move, 10 driver-score points, 1 USD daily funding delta, 1 bps 8h funding
  delta, and 50 million USD open-interest delta.
- Open-interest thresholds remain informational because open interest is useful
  participation context but not a standalone bullish or bearish signal.
- Threshold controls should be local and resettable so the app remains a
  read-only review surface rather than a saved strategy configuration tool.

## related features

- [[../features/configurable-recheck-thresholds]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-review-packet]]
