# receipt volatility buffer

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

After a live recheck, a trader needs to know whether the current listed
liquidation buffer is large or small relative to recent public market movement.
The app should compare current listed buffer distance with 24h candle range and
ATR-style movement, then turn that into review cues without predicting price or
recommending a trade.

## source links

- [[../sources/perp-volatility-buffer]]
- [[mark-price-context]]
- [[receipt-recheck-watchlist]]
- [[receipt-review-packet]]
- [[redacted-market-trend]]

## implemented behavior

- Adds a `Volatility buffer` panel after local receipt live recheck.
- Uses the existing read-only Hyperliquid market-history route; no new endpoint
  or raw trading action is added.
- Loads public 24h candles for up to five comparable current PERP positions.
- Compares current listed liquidation distance with 24h high-low range,
  adverse 24h move for the current side, and average true range percent.
- Labels rows as high/watch/info when public range exceeds the current listed
  buffer, uses at least half the buffer, or tight buffers overlap adverse
  movement.
- Adds loaded volatility-buffer context to the review packet.

## related ideas

- [[mark-price-context]] supplies the current listed buffer and comparable
  position rows.
- [[receipt-review-packet]] preserves loaded volatility context in copied
  markdown.
- [[redacted-market-trend]] is the privacy-preserving market-only sibling for
  redacted shares.
- [[receipt-recheck-watchlist]] could later include volatility-buffer cues in
  its ranked inspect-first list.
