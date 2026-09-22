# Miden Drop Chain

This workspace contains one contract: the MASM bearer note at
`contracts/drop-note/src/drop_note.masm`.

## Source of truth

- Note script: `contracts/drop-note/src/drop_note.masm`
- Note semantics: `contracts/drop-note/README.md`
- Integration tests: `integration/tests/drop_note_test.rs`

Do not introduce generic template contracts, Rust account components, or unrelated package
plumbing unless a new product requirement explicitly needs them.

## Contract invariants

- Note storage contains four Felts: `[recovery_block, pair_prefix, pair_suffix, raw_target_price]`.
- Recovery block is mandatory and non-zero. Zero Oracle fields disable price gating only.
- Before recovery, the sender is locked out; other bearers need the complete private note.
- Optional BTC/USD (`1:0`) or ETH/USD (`2:0`) conditions require a fresh Pragma median at or above
  the eight-decimal target. Partial conditions and unsupported pairs are rejected.
- At and after recovery, only `active_note::get_sender()` may consume, without Pragma inputs.
- All note assets are transferred via
  `miden::standards::wallets::basic::move_note_assets_to_account`.
- Expiration uses the transaction reference block returned by `tx::get_block_number()`.
- The expiration boundary is inclusive.
- Reclaim is never automatic; the sender must consume the note.

## Verification

Run from `chain/`:

```sh
cargo fmt --all -- --check
cargo test -p integration --release --locked
```

The tests compile the MASM script through `NoteBuilder::code`. There is no standalone contract
build command for the current layout.

Every behavior change must cover, where applicable:

1. Plain claims with zeroed Oracle fields and a non-zero recovery block.
2. Price comparisons, pair validation, and sender lockout before recovery.
3. Non-sender rejection at or after expiration.
4. Sender reclaim at or after expiration.
5. Asset transfer through `account_patch().vault().updated_assets()`.

Keep the browser MASM copy and deployment pins synchronized. Use Rust 1.98.1 and Miden 0.16.1.

## Relevant Claude skills

- `.claude/skills/drop-note-development/SKILL.md`
- `.claude/skills/drop-note-testing/SKILL.md`
- `.claude/skills/miden-concepts/SKILL.md`
