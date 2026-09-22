import { Transaction as WalletTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import type { WalletContextState } from "@miden-sdk/miden-wallet-adapter-react";

import { assertCurrentMidenRelease, base64UrlToBytes, type DropEnvelopeV1 } from "@/lib/drop/protocol";
import { findMidenPricePair } from "./price-pairs";
import { canonicalMidenNoteId, midenNoteIdsEqual } from "./note-id";
import { getOracleForeignAccounts } from "./oracle";

type ClaimWallet = Pick<
  WalletContextState,
  "address" | "importPrivateNote" | "requestTransaction" | "waitForTransaction"
>;

export type ClaimProgress = "validating" | "importing" | "requesting" | "confirming";

export async function claimMidenDrop(
  wallet: ClaimWallet,
  envelope: DropEnvelopeV1,
  onProgress?: (progress: ClaimProgress) => void,
) {
  assertCurrentMidenRelease(envelope);
  if (!wallet.importPrivateNote || !wallet.requestTransaction || !wallet.waitForTransaction) {
    throw new Error("The connected wallet does not support private note imports.");
  }

  const noteBytes = base64UrlToBytes(envelope.noteFile);
  let importBytes: Uint8Array<ArrayBufferLike> = noteBytes;
  let completeNoteBytes: Uint8Array<ArrayBufferLike> = noteBytes;
  try {
    onProgress?.("validating");
    const preparedNote = await prepareNoteFile(noteBytes, envelope);
    const noteId = preparedNote.noteId;
    importBytes = preparedNote.importBytes;
    completeNoteBytes = preparedNote.completeNoteBytes;
    const oracleTransaction = envelope.pricePair
      ? await createOracleClaim(wallet.address, envelope, importBytes, completeNoteBytes)
      : undefined;
    try {
      onProgress?.("importing");
      await wallet.importPrivateNote(importBytes);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : String(importError);
      if (!/already|duplicate|exists/iu.test(message)) throw importError;
    }
    const amount = BigInt(envelope.amount);
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("This drop amount exceeds the wallet adapter limit.");
    }

    const transaction = oracleTransaction ?? WalletTransaction.createConsumeTransaction(
      envelope.faucetId,
      canonicalMidenNoteId(noteId),
      "private",
      Number(amount),
      completeNoteBytes,
    );
    onProgress?.("requesting");
    const transactionId = await wallet.requestTransaction(transaction);
    onProgress?.("confirming");
    await wallet.waitForTransaction(transactionId, 180_000);
    return transactionId;
  } finally {
    if (importBytes !== noteBytes) importBytes.fill(0);
    if (completeNoteBytes !== noteBytes) completeNoteBytes.fill(0);
    noteBytes.fill(0);
  }
}

async function createOracleClaim(
  address: string | null,
  envelope: DropEnvelopeV1,
  importBytes: Uint8Array,
  noteBytes: Uint8Array,
) {
  if (!address) throw new Error("Connect a Miden wallet before claiming this drop.");
  const sdk = await import("@miden-sdk/miden-sdk/lazy");
  const rpc = new sdk.RpcClient(new sdk.Endpoint("https://rpc.testnet.miden.io"));
  try {
    const header = await rpc.getBlockHeaderByNumber();
    try {
      // Recovery must still work when the Oracle or its publishers are unavailable.
      if (header.blockNum() >= envelope.expirationBlock) return undefined;
    } finally {
      header.free();
    }
    const pair = findMidenPricePair(envelope.pricePair!);
    if (!pair) throw new Error("This private drop uses an unsupported price pair.");
    const file = sdk.NoteFile.deserialize(importBytes);
    const note = file.note();
    const proof = file.inclusionProof();
    try {
      if (!note || !proof) throw new Error("The private drop is missing its inclusion proof.");
      const foreignAccounts = await getOracleForeignAccounts(rpc, pair, sdk);
      const input = sdk.InputNote.authenticated(note, proof);
      const builder = new sdk.TransactionRequestBuilder();
      const withNote = builder.withExplicitInputNote(input);
      const withForeign = withNote.withForeignAccounts(new sdk.ForeignAccountArray(foreignAccounts));
      const request = withForeign.build();
      try {
        return WalletTransaction.createCustomTransaction(
          address, address, request, [canonicalMidenNoteId(envelope.noteId)], [noteBytes],
        );
      } finally {
        request.free();
        withForeign.free();
        withNote.free();
        builder.free();
        input.free();
      }
    } finally {
      proof?.free();
      note?.free();
      file.free();
    }
  } finally {
    rpc.free();
  }
}

async function prepareNoteFile(noteBytes: Uint8Array, envelope: DropEnvelopeV1) {
  const sdk = await import("@miden-sdk/miden-sdk/lazy");
  await sdk.MidenClient.ready();
  let note: InstanceType<typeof sdk.Note> | undefined;
  try {
    note = sdk.Note.deserialize(noteBytes);
  } catch {
    // Older drops used NoteFile bytes. Fall through to that decoder.
  }

  if (note) {
    try {
      const noteId = note.id();
      try {
        const embeddedNoteId = noteId.toString();
        if (!midenNoteIdsEqual(embeddedNoteId, envelope.noteId)) {
          throw new Error("The encrypted note does not match this private drop.");
        }
        validateNoteAssets(note.assets(), envelope, sdk);
        validateNoteStorage(note, envelope);
        const importBytes = await authenticatedNoteFileBytes(note, embeddedNoteId, sdk);
        return { noteId: embeddedNoteId, importBytes, completeNoteBytes: noteBytes };
      } finally {
        noteId.free();
      }
    } finally {
      note.free();
    }
  }

  const noteFile = sdk.NoteFile.deserialize(noteBytes);
  try {
    const completeNote = noteFile.note();
    if (completeNote) {
      try {
        const noteId = completeNote.id();
        try {
          const embeddedNoteId = noteId.toString();
          if (!midenNoteIdsEqual(embeddedNoteId, envelope.noteId)) {
            throw new Error("The encrypted note does not match this private drop.");
          }
          validateNoteAssets(completeNote.assets(), envelope, sdk);
          validateNoteStorage(completeNote, envelope);
          return { noteId: embeddedNoteId, importBytes: noteBytes, completeNoteBytes: completeNote.serialize() };
        } finally {
          noteId.free();
        }
      } finally {
        completeNote.free();
      }
    }

    const details = noteFile.noteDetails();
    details?.free();
    throw new Error(
      "This legacy private drop does not contain the complete note. Ask the sender to create a new drop.",
    );
  } finally {
    noteFile.free();
  }
}

function validateNoteStorage(
  note: InstanceType<typeof import("@miden-sdk/miden-sdk/lazy").Note>,
  envelope: DropEnvelopeV1,
) {
  const pair = envelope.pricePair ? findMidenPricePair(envelope.pricePair) : undefined;
  if (envelope.pricePair && !pair) throw new Error("This private drop uses an unsupported price pair.");

  const recipient = note.recipient();
  try {
    const storage = recipient.storage();
    try {
      const items = storage.items();
      try {
        const actual = items.map((item) => item.asInt());
        const expected = [
          BigInt(envelope.expirationBlock),
          BigInt(pair?.pairPrefix ?? 0),
          BigInt(pair?.pairSuffix ?? 0),
          BigInt(envelope.rawTargetPrice ?? 0),
        ];
        if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
          throw new Error("The encrypted note conditions do not match this private drop.");
        }
      } finally {
        for (const item of items) item.free();
      }
    } finally {
      storage.free();
    }
  } finally {
    recipient.free();
  }
}

async function authenticatedNoteFileBytes(
  note: InstanceType<typeof import("@miden-sdk/miden-sdk/lazy").Note>,
  noteId: string,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  const rpc = new sdk.RpcClient(new sdk.Endpoint("https://rpc.testnet.miden.io"));
  let fetchedNote: Awaited<ReturnType<typeof rpc.getNotesById>>[number] | undefined;
  try {
    // getNotesById takes ownership of every NoteId in the array.
    const fetchedNotes = await rpc.getNotesById([sdk.NoteId.fromHex(canonicalMidenNoteId(noteId))]);
    fetchedNote = fetchedNotes[0];
    for (const extra of fetchedNotes.slice(1)) extra.free();
    if (!fetchedNote) {
      throw new Error("This private note is not yet available on Miden Testnet. Try again shortly.");
    }

    const proof = fetchedNote.inclusionProof;
    const inputNote = sdk.InputNote.authenticated(note, proof);
    try {
      const noteFile = sdk.NoteFile.fromInputNote(inputNote);
      try {
        return noteFile.serialize();
      } finally {
        noteFile.free();
      }
    } finally {
      inputNote.free();
      proof.free();
    }
  } finally {
    fetchedNote?.free();
    rpc.free();
  }
}

function validateNoteAssets(
  assets: InstanceType<typeof import("@miden-sdk/miden-sdk/lazy").NoteAssets>,
  envelope: DropEnvelopeV1,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  try {
    const fungibleAssets = assets.fungibleAssets();
    if (fungibleAssets.length !== 1) throw new Error("The encrypted note contains unexpected assets.");
    const asset = fungibleAssets[0];
    try {
      const actualFaucet = asset.faucetId();
      const expectedFaucet = accountIdFromAddress(envelope.faucetId, sdk);
      try {
        if (asset.amount() !== BigInt(envelope.amount) || actualFaucet.toString() !== expectedFaucet.toString()) {
          throw new Error("The encrypted note assets do not match this private drop.");
        }
      } finally {
        actualFaucet.free();
        expectedFaucet.free();
      }
    } finally {
      asset.free();
      for (const extraAsset of fungibleAssets.slice(1)) extraAsset.free();
    }
  } finally {
    assets.free();
  }
}

function accountIdFromAddress(
  value: string,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  if (value.startsWith("0x")) return sdk.AccountId.fromHex(value);
  try {
    const address = sdk.Address.fromBech32(value);
    try {
      return address.accountId();
    } finally {
      address.free();
    }
  } catch {
    return sdk.AccountId.fromBech32(value);
  }
}
