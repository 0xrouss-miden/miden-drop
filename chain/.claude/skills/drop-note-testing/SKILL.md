---
name: drop-note-testing
description: Test the Miden Drop MASM note with MockChain and NoteBuilder, covering permanent notes, expiration boundaries, unauthorized claims, sender reclaim, and asset deltas.
---

# Miden Drop Note Testing

The canonical suite is `integration/tests/drop_note_test.rs`.

## Constructing a note

Compile the local MASM source through `NoteBuilder`:

```rust
const DROP_NOTE_SCRIPT: &str =
    include_str!("../../contracts/drop-note/src/drop_note.masm");

let note = NoteBuilder::new(sender.id(), &mut note_rng)
    .code(DROP_NOTE_SCRIPT)
    .note_storage([Felt::from(expiration_block)])?
    .add_assets([asset])
    .build()?;
```

Every note must supply one storage item. Use zero for no expiration; do not omit storage.

Seed the note before building the chain:

```rust
builder.add_output_note(RawOutputNote::Full(note.clone()));
let mock_chain = builder.build()?;
```

## Reference-block behavior

Genesis is block 0. `prove_until_block(n)` advances the chain so transactions use block `n` as
their reference block. Because expiration is inclusive, a non-sender claim at exactly the configured
block must fail.

## Required cases

- `expiration_block = 0` remains claimable after advancing beyond arbitrary blocks.
- A non-sender can claim before a non-zero expiration block.
- A non-sender cannot claim at the expiration block.
- The original sender can reclaim at the expiration block.
- Successful claims add the expected asset to `executed_transaction.account_delta().vault()`.

When extending asset support, add mixed fungible/non-fungible and multi-asset coverage without
weakening the four lifecycle cases.

## Commands

```sh
cargo fmt --manifest-path integration/Cargo.toml -- --check
cargo test -p integration --test drop_note_test --release
```
