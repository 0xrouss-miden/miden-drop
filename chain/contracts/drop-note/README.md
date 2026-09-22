# Miden Drop bearer note

`src/drop_note.masm` defines the private bearer note used by Miden Drop, with optional price gating.

The note uses one script for both supported Pragma pairs. Its four storage items parameterize each
individual drop:

| Index | Value              | Meaning                                           |
|------:|--------------------|---------------------------------------------------|
| 0     | `recovery_block`   | Sender-only recovery begins at this block         |
| 1     | `pair_prefix`      | `0` for none; `1` for BTC/USD; `2` for ETH/USD    |
| 2     | `pair_suffix`      | `0` for none and both supported pairs             |
| 3     | `raw_target_price` | `0` for none; otherwise USD multiplied by `10^8`  |

Before `recovery_block`, the original sender account is explicitly rejected. Any other account with
the complete private note data may claim. When the three Oracle fields are non-zero/selected, the
claim additionally requires a fresh, tracked Pragma median with
`median_price >= raw_target_price`. When all three fields are zero, no foreign-account call occurs.

At and after `recovery_block`, the Oracle call is skipped and only the original sender can consume
the note. Recovery is not automatic; the sender must submit the consuming transaction.

The script pins the v0.16 testnet Pragma Oracle account and `get_median` MAST root. A Pragma redeployment
or procedure upgrade requires updating those constants and therefore creates a new note-script root.

Deployment verified by RPC on 2026-09-22:

- Oracle: `0x3b306d819a19b691205480e1619b5c`
- `get_median`: `0xab62a61417fb6c1edc191d24b6a3cc53b2071e671d7013ddd26860267b960b29`
- Current publisher: `0x22a42798e8519c914214f1a63009c8`
- Publisher `get_entry`: `0x508dc3920bc61785841e5321b7a3227a07a277bbff4ca514d7cee0caeb248096`

The frontend discovers publishers from Pragma's registry rather than fixing that list. Before
recovery, a consuming transaction needs public foreign-account requirements for
`pragma::oracle::publishers` and each publisher's `pragma::publisher::entries` map at the pair key.
At recovery, these foreign accounts are unnecessary. Missing or stale feed data cannot authorize
a price-gated claim.

The deployed roots were checked against [Pragma's source](https://github.com/astraly-labs/pragma-miden)
compiled with Miden 0.16.1. When reproducing the Oracle root, inject `GET_ENTRY_HASH` as the hex
word above; dot-joining the digest's numeric elements changes the MASM stack order and the root.

Both BTC/USD and ETH/USD currently use eight decimal places. For example:

- BTC/USD at `$65,000` is stored as `6_500_000_000_000`.
- ETH/USD at `$2,000` is stored as `200_000_000_000`.

The private note remains bearer authorization. Rejecting the sender's account does not prevent the
same person from using another account, which is an accepted limitation of this concept app.
