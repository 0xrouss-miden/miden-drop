import { Transaction as WalletTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import type { WalletContextState } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";
import type { NoteScript } from "@miden-sdk/miden-sdk";

import { expirationBlockFromDays } from "@/lib/drop/amount";
import { bytesToBase64Url, type DropEnvelopeV1 } from "@/lib/drop/protocol";
import { DROP_NOTE_SOURCE } from "./drop-note-source";
import { findMidenPricePair, type MidenPricePairId } from "./price-pairs";

const DROP_NOTE_TAG = 0x4d44524f;
let clientPromise: Promise<Awaited<ReturnType<typeof createClient>>> | undefined;
let scriptPromise: Promise<NoteScript> | undefined;

type WalletActions = Pick<WalletContextState, "address" | "requestTransaction" | "waitForTransaction">;

export type CreateMidenDropInput = {
  wallet: WalletActions;
  amount: bigint;
  expirationDays: number;
  message?: string;
  faucetId: string;
  blocksPerDay: number;
  pricePair: MidenPricePairId;
  rawTargetPrice: bigint;
};

export async function createMidenDrop(input: CreateMidenDropInput): Promise<{
  envelope: DropEnvelopeV1;
  transactionId: string;
}> {
  const { wallet } = input;
  if (!wallet.address || !wallet.requestTransaction || !wallet.waitForTransaction) {
    throw new Error("Connect a compatible Miden wallet before creating a drop.");
  }

  const sdk = await import("@miden-sdk/miden-sdk/lazy");
  await sdk.MidenClient.ready();
  const client = await getClient();
  await client.syncChain();
  const currentBlock = await client.getSyncHeight();
  const expirationBlock = expirationBlockFromDays(currentBlock, input.expirationDays, input.blocksPerDay);
  const pricePair = findMidenPricePair(input.pricePair);
  if (!pricePair) throw new Error("Choose a supported BTC/USD or ETH/USD price condition.");
  if (input.rawTargetPrice <= BigInt(0)) throw new Error("Enter a target price above zero.");
  const sender = accountIdFromAddress(wallet.address, sdk);
  const faucet = accountIdFromAddress(input.faucetId, sdk);
  const assets = new sdk.NoteAssets([new sdk.FungibleAsset(faucet, input.amount)]);
  const noteScript = await getDropNoteScript(client);
  const storage = new sdk.NoteStorage(new sdk.FeltArray([
    new sdk.Felt(BigInt(expirationBlock)),
    new sdk.Felt(BigInt(pricePair.pairPrefix)),
    new sdk.Felt(BigInt(pricePair.pairSuffix)),
    new sdk.Felt(input.rawTargetPrice),
  ]));
  const recipient = sdk.NoteRecipient.fromScript(noteScript, storage);
  const metadata = new sdk.NoteMetadata(sender, sdk.NoteType.Private, new sdk.NoteTag(DROP_NOTE_TAG));
  const note = new sdk.Note(assets, metadata, recipient);
  const noteId = note.id().toString();
  // Preserve the complete private note while we still own all of its metadata.
  // NoteFile.fromInputNote() may downgrade an unauthenticated private note to a
  // details-only export, which a fresh recipient wallet cannot import.
  const noteBytes = note.serialize();
  const request = new sdk.TransactionRequestBuilder()
    .withOwnOutputNotes(new sdk.NoteArray([note]))
    .build();
  const walletTransaction = WalletTransaction.createCustomTransaction(
    wallet.address,
    wallet.address,
    request,
  );
  const transactionId = await wallet.requestTransaction(walletTransaction);
  const result = await wallet.waitForTransaction(transactionId, 180_000);
  const output = result.outputNotes.find((candidate) => candidate.id().toString() === noteId);
  if (!output) throw new Error("The confirmed transaction did not return the private drop note.");
  return {
    transactionId,
    envelope: {
      version: 1,
      network: "testnet",
      noteFile: bytesToBase64Url(noteBytes),
      noteId,
      faucetId: input.faucetId,
      amount: input.amount.toString(),
      expirationBlock,
      pricePair: pricePair.id,
      rawTargetPrice: input.rawTargetPrice.toString(),
      ...(input.message ? { message: input.message } : {}),
    },
  };
}

export async function getCurrentMidenBlock() {
  const client = await getClient();
  await client.syncChain();
  return client.getSyncHeight();
}

async function createClient() {
  const { MidenClient } = await import("@miden-sdk/miden-sdk/lazy");
  return MidenClient.createTestnet({
    autoSync: false,
    noteTransportUrl: undefined,
    storeName: "miden-drop-public-chain-v1",
  });
}

function getClient() {
  clientPromise ??= createClient();
  return clientPromise;
}

function getDropNoteScript(client: Awaited<ReturnType<typeof createClient>>) {
  scriptPromise ??= client.compile.noteScript({ code: DROP_NOTE_SOURCE });
  return scriptPromise;
}

function accountIdFromAddress(
  value: string,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  if (value.startsWith("0x")) return sdk.AccountId.fromHex(value);
  try {
    return sdk.Address.fromBech32(value).accountId();
  } catch {
    return sdk.AccountId.fromBech32(value);
  }
}
