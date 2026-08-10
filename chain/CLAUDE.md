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

- Note storage contains exactly one Felt: `expiration_block`.
- `expiration_block == 0` disables expiration.
- Before a non-zero expiration block, the note is bearer-claimable by any account possessing its
  complete private data.
- At and after expiration, the consuming account must equal `active_note::get_sender()`.
- All note assets are transferred via
  `miden::standards::wallets::basic::add_assets_to_account`.
- Expiration uses the transaction reference block returned by `tx::get_block_number()`.
- The expiration boundary is inclusive.
- Reclaim is never automatic; the sender must consume the note.

## Verification

Run from `chain/`:

```sh
cargo fmt --manifest-path integration/Cargo.toml -- --check
cargo test -p integration --release
```

The tests compile the MASM script through `NoteBuilder::code`. There is no standalone contract
build command for the current layout.

Every behavior change must cover, where applicable:

1. No expiration (`0`).
2. Claim before expiration.
3. Non-sender rejection at or after expiration.
4. Sender reclaim at or after expiration.
5. Asset transfer through the account delta.

## Relevant Claude skills

- `.claude/skills/drop-note-development/SKILL.md`
- `.claude/skills/drop-note-testing/SKILL.md`
- `.claude/skills/miden-concepts/SKILL.md`
