# redacted comparison assistant packet

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

Once a reviewer has compared two redacted snapshots, the comparison should not
live only as a visual panel. The reviewer should be able to ask "what changed?"
and copy a markdown packet that carries the same previous-versus-latest context
without exposing the hidden full snapshots.

## source links

- [[../sources/redacted-comparison-assistant-packet]]
- [[../sources/redacted-snapshot-comparison]]
- [[../sources/redacted-share-assistant]]
- [[../sources/redacted-review-packet]]
- [[redacted-snapshot-comparison]]
- [[redacted-share-assistant]]
- [[redacted-review-packet]]
- [[redacted-receipt-share]]

## implemented behavior

- Persists the redacted snapshot comparison result in the import-page state after
  the reviewer pastes a second redacted bundle.
- Feeds the comparison into the redacted share assistant.
- Adds a `Compare` assistant prompt when comparison context is loaded.
- Answers comparison questions with previous/latest receipt ids, timestamps,
  risk-score delta, visible cue counts, redacted-only freshness movement,
  notable metric movement, disclosed market-row changes, review points, and
  field-style citations.
- Explains when no comparison context is loaded and asks the reviewer to paste a
  second redacted bundle.
- Feeds the comparison into the copyable redacted review packet.
- Adds a `redacted snapshot comparison` markdown section to packets, with a
  not-loaded fallback when no comparison exists.
- Does not change the redacted bundle format, call a new endpoint, or disclose
  hidden full-snapshot fields.

## related ideas

- [[redacted-snapshot-comparison]] supplies the comparison object and labels.
- [[redacted-share-assistant]] now answers comparison questions from the loaded
  comparison.
- [[redacted-review-packet]] now carries the comparison into copyable markdown.
- [[redacted-receipt-share]] remains the privacy boundary for visible fields.
