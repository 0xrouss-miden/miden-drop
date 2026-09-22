---
name: drop-note-testing
description: Test the Miden Drop v0.16 note with MockChain, including private notes, Pragma conditions, recovery boundaries, and asset patches.
---

# Miden Drop Note Testing

The canonical suite is `integration/tests/drop_note_test.rs`. Compile local MASM with `NoteBuilder`,
set `.note_type(NoteType::Private)`, and provide four storage Felts:
`[recovery_block, pair_prefix, pair_suffix, raw_target_price]`. Recovery block must be non-zero.

Seed notes with `builder.add_output_note(RawOutputNote::Full(note.clone()))` before building the
chain. In v0.16, execute via `mock_chain.build_transaction(consumer_id)` and
`.authenticated_input_note(note.id())`. Add foreign-account inputs only in tests that require them.
Mock Oracle exports need `@account_procedure`; replace the deployed Oracle ID and root in the
script with those of the mock component.

Genesis is block 0. `prove_until_block(n)` makes block `n` the transaction reference block.
Check these behavior boundaries when relevant:

- Plain bearer claims with zero Oracle fields.
- BTC/USD and ETH/USD claims, equality and below-target rejection.
- Unsupported pairs and partial conditions.
- Sender lockout before recovery.
- Non-sender rejection at the recovery block.
- Sender recovery at and after that block without any Oracle inputs.
- Received assets via `executed_transaction.account_patch().vault().updated_assets()`.

Run from `chain/` so rustup selects Rust 1.98.1:

```sh
cargo fmt --all -- --check
cargo test -p integration --test drop_note_test --release --locked
```

`cargo run -p integration --example verify_testnet --release --locked` separately checks the live
faucets and pinned Pragma procedure using read-only RPC. It does not sign or submit transactions.
