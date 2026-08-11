import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DROP_NOTE_SOURCE } from "./drop-note-source";

describe("browser drop-note source", () => {
  it("is byte-for-byte identical to the canonical MASM contract", () => {
    const canonical = readFileSync(path.resolve(process.cwd(), "../chain/contracts/drop-note/src/drop_note.masm"), "utf8");
    expect(DROP_NOTE_SOURCE).toBe(canonical);
  });
});
