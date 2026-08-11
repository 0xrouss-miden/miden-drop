# Miden Drop — Chain

Chain logic for Miden Drop's private bearer note with optional Pragma price gating.

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

`drop_note.masm` is one parameterized script for plain, BTC/USD, and ETH/USD drops. Every note stores:

- the sender-only recovery block;
- the Pragma pair prefix (`0` for none, `1` for BTC/USD, or `2` for ETH/USD);
- the pair suffix (`0`);
- the eight-decimal raw target price (`0` when the Oracle is disabled).

Before the recovery block, the sender account cannot consume the note. Another bearer may consume it
immediately when the Oracle fields are zero, or only after Pragma returns a fresh, tracked median at
or above the configured target when price gating is enabled. At and after the recovery block, the
Oracle is skipped and only the original sender may recover the assets.

Recovery is expressed as a block height and is not automatic. The sender must submit a transaction
that consumes the note.

The complete private note data remains bearer authorization. It must only be shared with the
intended recipient.

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

The integration suite compiles the MASM with Miden's `CodeBuilder` and uses a deterministic public
mock Oracle through the same FPI interface as Pragma. It covers the no-Oracle path, both supported
pairs, equality and below-target comparisons, partial-condition rejection, the pair allowlist, early
sender lockout, and both sides of the recovery boundary.

Frontend creation, private-note transport, and live-node submission remain outside this folder.
