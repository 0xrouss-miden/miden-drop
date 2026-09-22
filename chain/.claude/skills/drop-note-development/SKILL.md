---
name: drop-note-development
description: Develop the Miden Drop MASM bearer note, its Pragma conditions, sender recovery, and Basic Wallet asset transfer.
---

# Miden Drop Note Development

The canonical source is `contracts/drop-note/src/drop_note.masm`; keep its browser copy in
`../frontend/lib/miden/drop-note-source.ts` identical. Semantics and deployment pins are documented
in `contracts/drop-note/README.md`.

## Contract invariants

Storage contains exactly four Felts: `[recovery_block, pair_prefix, pair_suffix, raw_target_price]`.
Recovery is mandatory and non-zero. Zeroing all three Oracle fields disables price gating.
Otherwise support only BTC/USD (`1:0`) and ETH/USD (`2:0`) with a positive eight-decimal USD target.

Before recovery, reject the sender and allow other bearers only when the optional fresh Pragma
median reaches the target. At and after recovery, skip Pragma and permit only the sender.
Use `tx::get_block_number()` as consensus time and `account_id::eq` for account comparison.
Possession of complete private note data authorizes a bearer; it does not bind a specific recipient.
Recovery always requires a consuming transaction.

## Miden v0.16 API

Transfer assets through the standard wallet procedure, which authenticates the account boundary:

```masm
use miden::standards::wallets::basic as basic_wallet
exec.basic_wallet::move_note_assets_to_account
```

The consuming account must expose Basic Wallet `receive_asset`. Price-gated consumption declares
Pragma and its publishers as foreign accounts with the relevant storage map keys. Recovery needs
no foreign accounts. Changing a pinned account or procedure root changes the note script root.

## Validation

Run from `chain/` with the pinned Rust toolchain:

```sh
cargo test -p integration --test drop_note_test --release --locked
```

Run `bun run test` from `frontend/` for browser source parity and wallet request tests.
