import { describe, expect, it } from "vitest";

import { canonicalMidenNoteId, midenNoteIdsEqual } from "./note-id";

const NOTE_ID = "ab".repeat(32);

describe("Miden note IDs", () => {
  it("normalizes prefixes and casing", () => {
    expect(canonicalMidenNoteId(`0x${NOTE_ID.toUpperCase()}`)).toBe(`0x${NOTE_ID}`);
    expect(midenNoteIdsEqual(NOTE_ID, `0x${NOTE_ID.toUpperCase()}`)).toBe(true);
  });

  it("rejects malformed or different IDs", () => {
    expect(() => canonicalMidenNoteId("note-1")).toThrow("Invalid Miden note ID");
    expect(midenNoteIdsEqual(NOTE_ID, "cd".repeat(32))).toBe(false);
  });
});
