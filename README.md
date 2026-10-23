# Miden Drop

Private bearer drops on **Miden Mainnet (Cedar), protocol v0.17**, with optional BTC/USD or ETH/USD price conditions from Pragma. The sender creates a private note, encrypts its complete contents, and shares a link whose secret stays in the URL fragment. Before the recovery block another bearer may claim; from that block onward only the sender may recover.

## Release compatibility

| Component | Version |
| --- | --- |
| Miden SDK and wallet adapters | 0.17.6 |
| Rust client | 0.17.5 |
| Protocol, standards, testing | 0.17.1 |
| Rust toolchain | 1.98.1 |
| Bun | 1.3.14 |

Cedar uses `https://rpc.cedar.miden.io`. The wallet provider, explicit connections, and public-chain reads all target mainnet. Supported assets are USDCx (6 decimals) and ETH (8 decimals), verified against their Cedar accounts. Connect a mainnet-enabled Bread wallet admitted to Cedar.

New envelopes bind `network: "mainnet"` and `midenRelease: "0.17"`; encryption uses Cedar-specific authenticated data, and the public-chain browser cache is isolated in `miden-drop-public-chain-mainnet-cedar-v0.17`. Old testnet links are recognized and rejected before any wallet action. Existing encrypted database rows need no schema migration.

Pragma Oracle v1 is live on Cedar. BTC/USD and ETH/USD conditions use hashed pair names and require at least one fresh publisher, eight-decimal prices, and an update within 120 seconds of the transaction reference block. Cedar currently has one registered Pragma publisher. Recovery bypasses the oracle. See the [deployment pins and contract semantics](chain/contracts/drop-note/README.md).

Transactions require the native fee asset (USDCx). Connect a compatible Basic Wallet with funds for the drop and transaction fees. The app delegates signing, execution, proving, and submission to the wallet. Custom requests support ordinary and guardian wallets: the app reads `requestGuardianInfo()` and declares a fresh cryptographically random fee conversion salt for each guarded-multisig request. The wallet coordinates guardian signatures over that same request.

## Run locally

```sh
cd frontend
bun install --frozen-lockfile
cp .env.example .env.local
# Set DATABASE_URL to your PostgreSQL database.
bun run db:migrate
bun run dev
```

The database stores encrypted drop payloads. The private note and link secret are decrypted in the browser. See [frontend/README.md](frontend/README.md) for implementation details and [chain/README.md](chain/README.md) for contract semantics.

## Verify

```sh
cd frontend
bun run typecheck
bun run lint
bun run test
bun run build
```

```sh
cd chain
cargo fmt --all -- --check
cargo test -p integration --release --locked
cargo run -p integration --example verify_cedar --release --locked
```

The last command is a read-only live RPC check of token symbols/decimals, the pinned Pragma procedure, pair keys, and fresh publisher entries. Automated tests exercise contract execution with private notes and a deterministic mock Oracle, browser WASM serialization, encrypted payloads, and wallet request construction. A full wallet-to-wallet send/claim/recovery requires funded Cedar wallets and is a separate manual check.

Release references: [Web SDK v0.17.6](https://github.com/0xMiden/web-sdk/releases/tag/v0.17.6), [Rust SDK v0.17.5](https://github.com/0xMiden/rust-sdk/releases/tag/v0.17.5), [Pragma Miden](https://github.com/astraly-labs/pragma-miden).

Cedar references: [Bread network configuration](https://github.com/0xMiden/wallet/blob/main/src/lib/miden-chain/networks-config.ts), [verified mainnet token list](https://github.com/0xMiden/token-list/blob/main/mainnet.json), [Pragma mainnet deployment PR](https://github.com/astraly-labs/pragma-miden/pull/117) (addresses independently verified by RPC).
