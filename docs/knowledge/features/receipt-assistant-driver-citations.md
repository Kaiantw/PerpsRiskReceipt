# receipt assistant driver citations

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

Once the receipt page compares saved and current risk drivers, the assistant
should answer driver-specific questions from that same panel instead of forcing
the reviewer to scan the table manually.

## source links

- [[../sources/perp-receipt-assistant-driver-citations]]
- [[../sources/perp-receipt-risk-driver-comparison]]
- [[receipt-risk-assistant]]
- [[receipt-risk-driver-comparison]]

## implemented behavior

- Adds `riskDriverComparison` to the local receipt assistant context.
- Adds a `Drivers` quick prompt after live recheck.
- Routes driver, top-risk, factor, exposure, and attribution questions to a
  driver-specific answer.
- Cites saved top driver, current top driver, score delta, gross exposure delta,
  closest listed-buffer delta, daily funding delta, and review points.
- Adds the risk-driver headline to the general review answer.
- Keeps trade-intent refusals ahead of driver routing.

## related ideas

- [[receipt-risk-driver-comparison]] remains the source panel.
- [[receipt-change-summary]] remains the high-level receipt verdict.
- [[receipt-risk-assistant]] can later become a real LLM layer if the app adds a
  server-side citation and privacy boundary.
