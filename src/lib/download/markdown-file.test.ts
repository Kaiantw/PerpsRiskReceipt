import assert from "node:assert/strict";
import test from "node:test";

import { buildMarkdownPacketFileName } from "./markdown-file.ts";

test("builds stable markdown packet filenames", () => {
  assert.equal(
    buildMarkdownPacketFileName({
      mode: "compact",
      packetKind: "redacted-review",
      receiptId: "rr_browser_compact_packet",
    }),
    "rr_browser_compact_packet.compact.redacted-review.md",
  );
  assert.equal(
    buildMarkdownPacketFileName({
      packetKind: "receipt-review",
      receiptId: "RR A/B:C? 123",
    }),
    "rr-a-b-c-123.receipt-review.md",
  );
});

test("falls back when a receipt id has no filename-safe characters", () => {
  assert.equal(
    buildMarkdownPacketFileName({
      mode: "full",
      packetKind: "redacted-review",
      receiptId: "///",
    }),
    "receipt.full.redacted-review.md",
  );
});
