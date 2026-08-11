import { Transaction as WalletTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import type { WalletContextState } from "@miden-sdk/miden-wallet-adapter-react/dist/useWallet.js";

import { base64UrlToBytes, type DropEnvelopeV1 } from "@/lib/drop/protocol";
import { canonicalMidenNoteId, midenNoteIdsEqual } from "./note-id";

type ClaimWallet = Pick<
  WalletContextState,
  "importPrivateNote" | "requestTransaction" | "waitForTransaction"
>;

export type ClaimProgress = "validating" | "importing" | "requesting" | "confirming";

export async function claimMidenDrop(
  wallet: ClaimWallet,
  envelope: DropEnvelopeV1,
  onProgress?: (progress: ClaimProgress) => void,
) {
  if (!wallet.importPrivateNote || !wallet.requestTransaction || !wallet.waitForTransaction) {
    throw new Error("The connected wallet does not support private note imports.");
  }

  const noteBytes = base64UrlToBytes(envelope.noteFile);
  let importBytes: Uint8Array<ArrayBufferLike> = noteBytes;
  try {
    onProgress?.("validating");
    const preparedNote = await prepareNoteFile(noteBytes, envelope);
    const noteId = preparedNote.noteId;
    importBytes = preparedNote.importBytes;
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

    const transaction = WalletTransaction.createConsumeTransaction(
      envelope.faucetId,
      canonicalMidenNoteId(noteId),
      "private",
      Number(amount),
      noteBytes,
    );
    onProgress?.("requesting");
    const transactionId = await wallet.requestTransaction(transaction);
    onProgress?.("confirming");
    await wallet.waitForTransaction(transactionId, 180_000);
    return transactionId;
  } finally {
    if (importBytes !== noteBytes) importBytes.fill(0);
    noteBytes.fill(0);
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
        const importBytes = await authenticatedNoteFileBytes(note, embeddedNoteId, sdk);
        return { noteId: embeddedNoteId, importBytes };
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
          return { noteId: embeddedNoteId, importBytes: noteBytes };
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

async function authenticatedNoteFileBytes(
  note: InstanceType<typeof import("@miden-sdk/miden-sdk/lazy").Note>,
  noteId: string,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  const rpc = new sdk.RpcClient(new sdk.Endpoint("https://rpc.testnet.miden.io"));
  let fetchedNote: Awaited<ReturnType<typeof rpc.getNotesById>>[number] | undefined;
  try {
    const parsedNoteId = sdk.NoteId.fromHex(canonicalMidenNoteId(noteId));
    const fetchedNotes = await rpc.getNotesById([parsedNoteId]);
    fetchedNote = fetchedNotes[0];
    for (const extra of fetchedNotes.slice(1)) extra.free();
    if (!fetchedNote) {
      throw new Error("This private note is not yet available on Miden Testnet. Try again shortly.");
    }

    const inputNote = sdk.InputNote.authenticated(note, fetchedNote.inclusionProof);
    try {
      const noteFile = sdk.NoteFile.fromInputNote(inputNote);
      try {
        return noteFile.serialize();
      } finally {
        noteFile.free();
      }
    } finally {
      inputNote.free();
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
