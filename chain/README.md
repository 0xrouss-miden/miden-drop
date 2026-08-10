# Miden Drop — Chain

Chain logic for Miden Drop's private, expirable bearer note.

## Structure

```text
chain/
├── contracts/
│   └── drop-note/
│       ├── README.md
│       └── src/drop_note.masm
├── integration/
│   └── tests/drop_note_test.rs
├── Cargo.toml
└── rust-toolchain.toml
```

## Note behavior

`drop_note.masm` transfers every attached asset through Miden's standard Basic Wallet interface.
Its storage contains exactly one field, `expiration_block`:

- `0`: expiration is disabled.
- Non-zero: anyone holding the complete private note data may claim before that block.
- At and after that block: only the original sender may consume the note and recover its assets.

Expiration is expressed as a block height and recovery is not automatic. The sender must submit a
transaction consuming the expired note.

The complete private note data is bearer authorization. It must only be shared with the intended
recipient.

## Requirements

- Rust toolchain from `rust-toolchain.toml`.
- Miden-compatible dependencies resolved by Cargo.

## Test

From `chain/`:

```sh
cargo test -p integration --release
```

Run only the drop-note integration suite:

```sh
cargo test -p integration --test drop_note_test --release
```

The MASM source is compiled by Miden's `CodeBuilder` when `NoteBuilder` constructs the test notes;
there is no separate contract build step.

## Current scope

- MASM note script.
- Optional block-height expiration.
- Sender reclaim after expiration.
- Fungible asset transfer through Basic Wallet.
- MockChain coverage for permanent, active, expired, and reclaimed states.

Frontend creation, private-note transport, live-node submission, and automatic time-to-block
estimation are intentionally outside this folder's current implementation.
