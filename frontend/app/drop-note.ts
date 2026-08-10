import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
import { toBaseUnits } from "./amounts";

// Generated from chain/contracts/drop-note/src/drop_note.masm.
// Source SHA-256: 7d5ee373529f5a398616d5ee63853f1f679cfd7b63049a27b9cc6e6a74b77c72
const DROP_NOTE_SCRIPT_BASE64 = "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";

export const DROP_EXPIRATIONS = [
  { label: "1,000 blocks", blocks: 1_000 },
  { label: "10,000 blocks", blocks: 10_000 },
  { label: "50,000 blocks", blocks: 50_000 },
] as const;

export type DropCreationInput = {
  address: string;
  amount: string;
  decimals: number;
  faucetId: string;
  symbol: string;
  expirationBlocks: number;
  message: string;
  requestTransaction: (transaction: Transaction) => Promise<string>;
};

export type CreatedDrop = {
  amount: string;
  expirationBlock: number;
  link: string;
  symbol: string;
  transactionId: string;
};

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(value: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function createClaimLink(payload: object) {
  const url = new URL("/claim", window.location.origin);
  url.hash = textToBase64Url(JSON.stringify(payload));
  return url.toString();
}

export async function createDropNote(input: DropCreationInput): Promise<CreatedDrop> {
  const sdk = await import("@miden-sdk/miden-sdk/lazy");
  await sdk.MidenClient.ready();

  const rpc = new sdk.RpcClient(sdk.Endpoint.testnet());
  try {
    const latestBlock = await rpc.getBlockHeaderByNumber(undefined, false);
    const expirationBlock = latestBlock.blockNum() + input.expirationBlocks;
    latestBlock.free();

    const sender = sdk.AccountId.fromBech32(input.address);
    const faucet = sdk.AccountId.fromBech32(input.faucetId);
    const asset = new sdk.FungibleAsset(faucet, toBaseUnits(input.amount, input.decimals));
    const assets = new sdk.NoteAssets([asset]);
    const script = sdk.NoteScript.deserialize(base64ToBytes(DROP_NOTE_SCRIPT_BASE64));
    const storage = new sdk.NoteStorage(new sdk.FeltArray([new sdk.Felt(BigInt(expirationBlock))]));
    const recipient = sdk.NoteRecipient.fromScript(script, storage);
    const metadata = new sdk.NoteMetadata(sender, sdk.NoteType.Private, new sdk.NoteTag(0));
    const note = new sdk.Note(assets, metadata, recipient);
    const notes = new sdk.NoteArray();
    notes.push(note);

    const transactionRequest = new sdk.TransactionRequestBuilder()
      .withOwnOutputNotes(notes)
      .build();
    const transaction = Transaction.createCustomTransaction(
      input.address,
      input.address,
      transactionRequest,
    );
    const transactionId = await input.requestTransaction(transaction);
    const link = createClaimLink({
      version: 1,
      network: "testnet",
      note: bytesToBase64Url(note.serialize()),
      amount: input.amount,
      symbol: input.symbol,
      faucetId: input.faucetId,
      expirationBlock,
      message: input.message || undefined,
      transactionId,
    });

    return { amount: input.amount, expirationBlock, link, symbol: input.symbol, transactionId };
  } finally {
    rpc.free();
  }
}
