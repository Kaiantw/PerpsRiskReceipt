# markdown packet download

## status

Implemented for local receipt review packets and imported redacted review
packets.

## product idea

Copying markdown is good for quick handoff, but reviewers sometimes need a file
they can attach to an issue, archive in a folder, or keep with other risk-review
evidence. Markdown packet download turns the already-rendered packet into a
browser-local `.md` file without changing the packet contents or privacy
boundary.

## source links

- [[../sources/markdown-packet-export]]
- [[receipt-review-packet]]
- [[redacted-review-packet]]
- [[compact-redacted-risk-note]]
- [[portable-receipt-bundle]]

## implemented behavior

- Adds a shared markdown filename/download helper with predictable sanitized
  filenames.
- Local receipt review packets can be downloaded as
  `<receipt>.receipt-review.md`.
- Imported redacted review packets can be downloaded as
  `<receipt>.compact.redacted-review.md` or
  `<receipt>.full.redacted-review.md` depending on the selected packet mode.
- Download uses the same markdown shown in the textarea and copied to the
  clipboard; it does not add fields or recompute hashes.
- The helper uses browser-local Blob/object URL download behavior and revokes
  the object URL after triggering the download.
- Filename sanitization is covered by tests.

## related ideas

- [[receipt-review-packet]] is the full local receipt packet source.
- [[redacted-review-packet]] is the detailed minimized/public packet source.
- [[compact-redacted-risk-note]] is the short public packet source.
- [[portable-receipt-bundle]] remains the full JSON verification/import artifact.
