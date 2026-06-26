# perp funding mechanics

## sources checked

- Hyperliquid funding docs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid perpetuals info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Coinbase funding-rate explainer: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures

## takeaways

- Funding is the periodic transfer between long and short perp holders that helps
  keep the perp price close to the underlying spot/oracle price.
- Hyperliquid expresses the funding formula as an eight-hour rate, but funding
  is paid hourly at one eighth of that computed rate.
- Hyperliquid's actual funding payment uses position size, oracle price, and
  funding rate. This app currently estimates funding from normalized notional,
  which is mark-price based in the local model.
- Funding should be framed as a holding-cost or earned-carry estimate, not as a
  trading recommendation.
- Historical and predicted funding endpoints exist. The carry/watch read uses
  current funding from `metaAndAssetCtxs`; [[perp-funding-persistence]] adds
  bounded public `fundingHistory` context for recent persistence.

## linked feature ideas

- [[../features/funding-carry-watch]]
- [[../features/funding-window-read]]
- [[../features/funding-persistence-read]]
- [[../features/live-receipt-recheck]]
- [[../features/ai-risk-assistant]]
