---
name: drop-note-development
description: Develop or review the Miden Drop MASM bearer note, including optional expiration, sender reclaim, Basic Wallet asset transfer, storage layout, and security invariants.
---

# Miden Drop Note Development

Use this skill for changes to `contracts/drop-note/src/drop_note.masm`.

## Product model

The note is a private bearer instrument. Before expiration, possession of the complete private note
data authorizes consumption. It does not target a recipient account.

The note stores exactly one Felt:

```text
[expiration_block]
```

- `0` disables expiration.
- For non-zero values, blocks below `expiration_block` remain bearer-claimable.
- At `expiration_block` and later, only the account matching `active_note::get_sender()` may consume
  the note.

The transaction reference block from `tx::get_block_number()` is the consensus time source. Do not
use wall-clock timestamps in the script.

## Asset transfer

Always transfer note assets with:

```masm
use miden::standards::wallets::basic->basic_wallet

exec.basic_wallet::add_assets_to_account
```

Do not call `native_account::add_asset` directly from the note. The transaction kernel authenticates
native account operations as originating from account code; the standard Basic Wallet procedure is
the compatible call boundary.

## Expiration check

The script must:

1. Load storage with `active_note::get_storage`.
2. Assert exactly one storage item.
3. Skip expiration checks when the value is zero.
4. Treat `expiration_block <= current_block` as expired.
5. When expired, compare `active_account::get_id` with `active_note::get_sender` using
   `account_id::is_equal`.
6. Transfer assets only after all checks pass.

Expiration does not create a transaction. It only changes who is permitted to consume the note.

## Required validation

```sh
cargo test -p integration --test drop_note_test --release
```

Keep `contracts/drop-note/README.md` synchronized with any semantic change.
