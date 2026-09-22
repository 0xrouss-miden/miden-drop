# Miden Drop

Private bearer drops on **Miden testnet v0.16**, with optional BTC/USD or ETH/USD price conditions from Pragma. The sender creates a private note, encrypts its complete contents, and shares a link whose secret stays in the URL fragment. Before the recovery block another bearer may claim; from that block onward only the sender may recover.

## Release compatibility

| Component | Version |
| --- | --- |
| Miden SDK and wallet adapters | 0.16.2 |
| Rust client, protocol, standards, testing | 0.16.1 |
| Rust toolchain | 1.98.1 |
| Bun | 1.3.14 |

The September 2026 testnet reset invalidated v0.15 accounts and notes. Existing encrypted links remain readable, but cannot be redeemed on v0.16. Create new drops using a wallet compatible with v0.16 and the current token faucets. New envelopes include `midenRelease: "0.16"`; the public-chain browser cache uses a separate v0.16 database.

Transactions require the native fee asset (MIDEN). Connect a compatible Basic Wallet with funds for the drop and transaction fees. The app delegates signing, execution, proving, and submission to the wallet. Custom requests support ordinary and guardian wallets: the app reads `requestGuardianInfo()` and declares a fresh cryptographically random fee conversion salt for each guarded-multisig request. The wallet coordinates guardian signatures over that same request.

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
cargo run -p integration --example verify_testnet --release --locked
```

The last command is a read-only live RPC check of faucet symbols/decimals and the pinned Pragma procedure. Automated tests exercise contract execution with private notes and a deterministic mock Oracle, browser WASM serialization, encrypted payloads, and wallet request construction. A full wallet-to-wallet send/claim/recovery requires funded testnet wallets and is a separate manual check.

Release references: [Web SDK v0.16.2](https://github.com/0xMiden/web-sdk/releases/tag/v0.16.2), [Rust SDK v0.16.1](https://github.com/0xMiden/rust-sdk/releases/tag/v0.16.1), [Pragma Miden](https://github.com/astraly-labs/pragma-miden).
