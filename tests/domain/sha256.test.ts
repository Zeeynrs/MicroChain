import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/domain/sha256";

describe("sha256Hex", () => {
  it.each(["", "abc", "Dapur Sari – tepung terigu ✓", "x".repeat(55), "x".repeat(56), "x".repeat(64), "x".repeat(1000)])(
    "matches node:crypto for input length %#",
    (input) => {
      expect(sha256Hex(input)).toBe(createHash("sha256").update(input).digest("hex"));
    },
  );
});
