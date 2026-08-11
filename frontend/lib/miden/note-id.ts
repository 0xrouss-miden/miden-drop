export function canonicalMidenNoteId(value: string) {
  const hex = value.trim().toLowerCase().replace(/^0x/u, "");
  if (!/^[0-9a-f]{64}$/u.test(hex)) throw new Error("Invalid Miden note ID.");
  return `0x${hex}`;
}

export function midenNoteIdsEqual(left: string, right: string) {
  try {
    return canonicalMidenNoteId(left) === canonicalMidenNoteId(right);
  } catch {
    return false;
  }
}
