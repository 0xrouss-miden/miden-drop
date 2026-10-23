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
claim additionally requires a Pragma Oracle v1 median with at least one fresh publisher, eight decimals,
and a non-zero update timestamp within 120 seconds of the transaction reference block, with
`median_price >= raw_target_price`. When all three fields are zero, no foreign-account call occurs.

At and after `recovery_block`, the Oracle call is skipped and only the original sender can consume
the note. Recovery is not automatic; the sender must submit the consuming transaction.

The script pins the Cedar mainnet Pragma Oracle v1 account and `get_median` MAST root. A Pragma redeployment
or procedure upgrade requires updating those constants and therefore creates a new note-script root.

Deployment verified by RPC on 2026-10-23:

- Oracle: `0x8f8d747477ca171144feadc60a1137`
- `get_median`: `0x633ac6865a1c4c27f065c07439d59bffdcd931ed9a706abbe2ae70dcd76031ac`
- Current publisher: `0x0b7956bf6589079170e900eb69cd84`
- Publisher `get_entry`: `0xaee2396720b28c39b2eb4c05e8c6c18f02ecd5699c80df8fa4396b4cd5337b4c`

The frontend discovers publishers from Pragma's registry rather than fixing that list. Before
recovery, a consuming transaction needs public foreign-account requirements for
`pragma::oracle::publishers` and each publisher's `pragma::publisher::entries` map at the pair key.
At recovery, these foreign accounts are unnecessary. Missing or stale feed data cannot authorize
a price-gated claim.

The deployment is published in [Pragma PR #117](https://github.com/astraly-labs/pragma-miden/pull/117), which was still open when verified. The root above was independently reproduced from [Pragma source commit 6e3ca37](https://github.com/astraly-labs/pragma-miden/tree/6e3ca37b9f355d901c4a6eff625fb0af46147b6b) with SDK 0.17.6 (protocol 0.17.1) and matched against the live account code. Render the publisher `GET_ENTRY_HASH` exactly as upstream `get_entry_procedure_hash()` does: reversed numeric digest limbs joined by dots.

Oracle v1 accepts a four-felt key and returns `[num_publishers, median_price, decimals, last_updated]`. The note retains compact numeric selectors in its storage and maps them to these fixed Poseidon2 hashes of UTF-8 pair names:

| Selector | Pair | Oracle storage key |
| --- | --- | --- |
| 1 | BTC/USD | `0xd189b4e9c38c367ba926ddb0044b781ca8fff18dcc10a0c75ff5600a1eb4d0eb` |
| 2 | ETH/USD | `0x9a50f4137c634e0b384a87bea3a186e578e21274af6ae752230ead4631233e1d` |

The minimum is one publisher, matching the currently deployed Cedar registry. A paused oracle returns no publishers and cannot authorize a claim. The pinned `get_median` filters entries at 120 seconds; the note independently validates the reported timestamp and scale. Both freshness and recovery are relative to the transaction reference block, not wall-clock submission time.

Both BTC/USD and ETH/USD currently use eight decimal places. For example:

- BTC/USD at `$65,000` is stored as `6_500_000_000_000`.
- ETH/USD at `$2,000` is stored as `200_000_000_000`.

The private note remains bearer authorization. Rejecting the sender's account does not prevent the
same person from using another account, which is an accepted limitation of this concept app.
