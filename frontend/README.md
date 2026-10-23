# Miden Drop frontend

Next.js application using the Miden SDK and wallet adapters **0.17.6** on Miden Mainnet (Cedar), protocol v0.17. Use Bun 1.3.14 and a PostgreSQL `DATABASE_URL` as shown in `.env.example`.

```sh
bun install --frozen-lockfile
bun run db:migrate
bun run dev
```

## Mini app experience

The primary experience is a compact workspace inside Bread Wallet, using the existing Miden wallet adapter. Direct URL access uses the same UI and connection flow. `/` and `/send` share the composer; `/receive` accepts private links and `/claim#v1…` continues to open bearer drops. The persistent root provider preserves the wallet session between routes.

Recovery timing, private messages, and price conditions live in Drop options. A created drop opens a sharing view with native Web Share when available, clipboard fallback, a selectable link, and a QR disclosure. Secrets stay in memory and in the bearer link; this UI adds no persistent drop history.

## Motion

`app/motion.tsx` owns the Motion for React provider and reusable controls, disclosures, feedback, and note-status marks. Shared navigation uses layout animation; transaction logic and wallet mounting are independent of animation. All motion respects reduced-motion preferences, including custom SVG and disclosure effects. Keep the `m` imports from `motion/react-m` inside the strict LazyMotion provider.

## Miden integration

- `lib/miden/drop-client.ts` compiles the canonical note script, builds a private output note, and asks the connected wallet to submit it. Complete `Note` bytes are encrypted in the drop envelope.
- `lib/miden/claim-client.ts` validates the note's assets and immutable conditions, fetches an inclusion proof, imports an authenticated `NoteFile`, and submits the claim through the wallet.
- Price-gated claims use Pragma Oracle v1 pair-name hashes and declare Pragma and all active publishers as public foreign accounts. `lib/miden/oracle.ts` selects the registry and pair storage keys; the wallet obtains proofs at its transaction reference block. Recovery at or after the expiration block bypasses Pragma.
- `lib/miden/config.ts` contains the verified Cedar USDCx and ETH accounts. `lib/miden/oracle.ts` and the MASM source pin the current Pragma account and procedure root. See the [contract documentation](../chain/contracts/drop-note/README.md).
- `next.config.ts` aliases the SDK root import to its lazy browser build. v0.17's default Node entry loads a native addon, so wallet adapters must resolve to the browser build even during Next.js server rendering. Import adapter APIs through their public package exports.
- `@miden-sdk/react` is required by the adapter's root exports. Keep all Miden JavaScript packages on the same release.
- `lib/miden/wallet-transaction.ts` checks `requestGuardianInfo()` for every custom request. Guardian wallets receive a fresh fee conversion salt that survives serialization and remains fixed through signing; ordinary wallets keep the SDK's default. The app cannot call `feeAwareTransactionRequestBuilder(account)` because the executing private account is held by the extension, not the public-chain client.

`lib/miden/network.ts` centralizes the Cedar RPC, wallet network, protocol release, and public-chain cache (`miden-drop-public-chain-mainnet-cedar-v0.17`). Adapter 0.17.6 forwards the `mainnet` string to Bread but omits it from its enum, so one documented type assertion bridges that declaration gap. Automatic and explicit connections use the same value; wallet selection is stored under a mainnet-specific key.

Wallets need USDCx for fees, including when sending ETH, and must be enabled for Cedar. Old testnet envelopes are authenticated only to report an incompatibility; their notes are never deserialized or submitted to mainnet. New encrypted envelopes bind the Cedar network through AES-GCM authenticated data. The PostgreSQL schema is unchanged.

## Checks

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

The source parity test keeps `lib/miden/drop-note-source.ts` identical to `../chain/contracts/drop-note/src/drop_note.masm`. The Oracle tests use the actual v0.17 browser WASM to check ownership and transaction serialization; wallet interactions are mocked. Run the read-only deployment check from `../chain` with `cargo run -p integration --example verify_cedar --release --locked`.
