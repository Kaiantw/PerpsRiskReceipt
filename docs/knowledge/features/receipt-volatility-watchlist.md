# receipt volatility watchlist

## status

Implemented for browser-local Hyperliquid receipt live rechecks after public
24h volatility is loaded.

## product idea

A volatility read is more useful when it changes the inspect-first queue. After
the reviewer loads public 24h candle history, high/watch volatility-buffer rows
should feed the `Recheck watchlist` and receipt assistant so a trader can see
whether recent market movement was large relative to the current listed
liquidation buffer.

## source links

- [[../sources/perp-volatility-watchlist]]
- [[../sources/perp-volatility-buffer]]
- [[../sources/perp-receipt-recheck-watchlist]]
- [[receipt-volatility-buffer]]
- [[receipt-recheck-watchlist]]
- [[receipt-market-regime]]
- [[receipt-assistant-watchlist-citations]]
- [[receipt-review-packet]]

## implemented behavior

- Adds `volatility_buffer` as a recheck watchlist category.
- Keeps the watchlist unchanged until public 24h market history is loaded.
- Adds high/watch volatility-buffer rows to the ranked watchlist after history
  loads.
- Ranks volatility-buffer cues above driver-score/funding/open-interest cues
  but below account, position-state, and listed liquidation-buffer cues.
- Adds a `Volatility` receipt assistant prompt when volatility context is
  loaded.
- Answers volatility questions from `receipt_volatility_buffer` fields with
  cited buffer, range, hourly ATR, and ATR-buffer-multiple values.
- Preserves the volatility-derived watchlist cue in copied review packets.

## related ideas

- [[receipt-volatility-buffer]] remains the public-history calculation and table.
- [[receipt-recheck-watchlist]] is the ranked inspect-first queue.
- [[receipt-assistant-watchlist-citations]] explains the same ranked queue in
  the local assistant.
- [[receipt-review-packet]] makes the volatility cue shareable in markdown.
- [[receipt-market-regime]] can escalate the overall regime when loaded
  volatility rows are high or watch.
