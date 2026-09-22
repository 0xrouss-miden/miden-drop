import { beforeEach, describe, expect, it, vi } from "vitest";

import { bytesToBase64Url, type DropEnvelopeV1 } from "@/lib/drop/protocol";

const NOTE_ID = `0x${"ab".repeat(32)}`;
const FAUCET_ID = "mtst1test-faucet";
const RECOVERY_BLOCK = 100;
const RAW_TARGET = BigInt("6500000000000");
const storageState = vi.hoisted(() => ({
  block: 0,
  current: [BigInt(100), BigInt(1), BigInt(0), BigInt("6500000000000")],
}));

vi.mock("./oracle", () => ({ getOracleForeignAccounts: vi.fn().mockResolvedValue([]) }));

function freeableId(value: string) {
  return { toString: () => value, free: vi.fn() };
}

vi.mock("@miden-sdk/miden-sdk/lazy", () => {
  class Note {
    static deserialize(bytes: Uint8Array) {
      if (bytes[0] !== 1) throw new Error("not a complete note");
      return new Note();
    }

    id() {
      return freeableId(NOTE_ID);
    }

    assets() {
      return {
        fungibleAssets: () => [{
          amount: () => BigInt(10),
          faucetId: () => freeableId(FAUCET_ID),
          free: vi.fn(),
        }],
        free: vi.fn(),
      };
    }

    recipient() {
      return {
        storage: () => ({
          items: () => storageState.current.map((value) => ({ asInt: () => value, free: vi.fn() })),
          free: vi.fn(),
        }),
        free: vi.fn(),
      };
    }

    serialize() { return new Uint8Array([1, 7, 9]); }

    free() {}
  }

  class NoteFile {
    constructor(private complete = false) {}
    inclusionProof() { return { free: vi.fn() }; }
    static deserialize(bytes: Uint8Array) {
      if (bytes[0] !== 2 && bytes[0] !== 3) throw new Error("not a note file");
      return new NoteFile(bytes[0] === 3);
    }

    static fromInputNote() {
      return {
        serialize: () => new Uint8Array([3, 7, 9]),
        free: vi.fn(),
      };
    }

    note() {
      return this.complete ? new Note() : undefined;
    }

    noteDetails() {
      return { free: vi.fn() };
    }

    free() {}
  }

  return {
    MidenClient: { ready: vi.fn().mockResolvedValue(undefined) },
    Note,
    NoteFile,
    NoteId: { fromHex: () => freeableId(NOTE_ID) },
    Endpoint: class Endpoint {},
    RpcClient: class RpcClient {
      async getBlockHeaderByNumber() { return { blockNum: () => storageState.block, free: vi.fn() }; }
      async getNotesById() {
        return [{ inclusionProof: { free: vi.fn() }, free: vi.fn() }];
      }

      free() {}
    },
    ForeignAccountArray: class ForeignAccountArray {},
    TransactionRequestBuilder: class TransactionRequestBuilder {
      withExplicitInputNote() { return this; }
      withForeignAccounts() { return this; }
      build() { return { serialize: () => new Uint8Array([4, 5]), free: vi.fn() }; }
      free() {}
    },
    InputNote: {
      authenticated: () => ({ free: vi.fn() }),
    },
    Address: {
      fromBech32: () => ({
        accountId: () => freeableId(FAUCET_ID),
        free: vi.fn(),
      }),
    },
    AccountId: { fromBech32: () => freeableId(FAUCET_ID) },
  };
});

import { claimMidenDrop } from "./claim-client";
import { getOracleForeignAccounts } from "./oracle";

function envelope(bytes: Uint8Array): DropEnvelopeV1 {
  return {
    version: 1,
    network: "testnet",
    midenRelease: "0.16",
    noteFile: bytesToBase64Url(bytes),
    noteId: NOTE_ID,
    faucetId: FAUCET_ID,
    amount: "10",
    expirationBlock: RECOVERY_BLOCK,
    pricePair: "BTC/USD",
    rawTargetPrice: RAW_TARGET.toString(),
  };
}

describe("claimMidenDrop note payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageState.block = 0;
    storageState.current = [BigInt(RECOVERY_BLOCK), BigInt(1), BigInt(0), RAW_TARGET];
  });

  it("imports an authenticated NoteFile and consumes the exact complete note bytes", async () => {
    let importedBytes: Uint8Array | undefined;
    let consumedBytes: string | undefined;
    const importPrivateNote = vi.fn().mockImplementation(async (value: Uint8Array) => {
      importedBytes = value.slice();
      return NOTE_ID;
    });
    const requestTransaction = vi.fn().mockImplementation(async (transaction) => {
      consumedBytes = transaction.payload.importNotes?.[0] ?? transaction.payload.noteBytes;
      return "tx-1";
    });
    const waitForTransaction = vi.fn().mockResolvedValue({});
    const bytes = new Uint8Array([1, 7, 9]);

    await expect(claimMidenDrop(
      { address: "mtst1wallet", importPrivateNote, requestTransaction, waitForTransaction },
      envelope(bytes),
    )).resolves.toBe("tx-1");

    expect(importPrivateNote).toHaveBeenCalledOnce();
    expect(importedBytes).toEqual(new Uint8Array([3, 7, 9]));
    expect(consumedBytes).toBe("AQcJ");
  });

  it("rejects a details-only legacy private note instead of importing an ID-only file", async () => {
    const importPrivateNote = vi.fn();
    const requestTransaction = vi.fn();
    const waitForTransaction = vi.fn();

    await expect(claimMidenDrop(
      { address: "mtst1wallet", importPrivateNote, requestTransaction, waitForTransaction },
      envelope(new Uint8Array([2, 7, 9])),
    )).rejects.toThrow("legacy private drop does not contain the complete note");

    expect(importPrivateNote).not.toHaveBeenCalled();
    expect(requestTransaction).not.toHaveBeenCalled();
  });

  it("rejects envelope conditions that do not match the note storage", async () => {
    const importPrivateNote = vi.fn();
    const requestTransaction = vi.fn();
    const waitForTransaction = vi.fn();
    const mismatched = { ...envelope(new Uint8Array([1, 7, 9])), pricePair: "ETH/USD" as const };

    await expect(claimMidenDrop(
      { address: "mtst1wallet", importPrivateNote, requestTransaction, waitForTransaction },
      mismatched,
    )).rejects.toThrow("note conditions do not match");

    expect(importPrivateNote).not.toHaveBeenCalled();
    expect(requestTransaction).not.toHaveBeenCalled();
  });

  it("accepts a note with no Oracle condition when all condition storage fields are zero", async () => {
    storageState.current = [BigInt(RECOVERY_BLOCK), BigInt(0), BigInt(0), BigInt(0)];
    const importPrivateNote = vi.fn().mockResolvedValue(NOTE_ID);
    const requestTransaction = vi.fn().mockResolvedValue("tx-plain");
    const waitForTransaction = vi.fn().mockResolvedValue({});
    const conditioned = envelope(new Uint8Array([1, 7, 9]));
    const plain: DropEnvelopeV1 = { ...conditioned };
    delete plain.pricePair;
    delete plain.rawTargetPrice;

    await expect(claimMidenDrop(
      { address: "mtst1wallet", importPrivateNote, requestTransaction, waitForTransaction },
      plain,
    )).resolves.toBe("tx-plain");
    expect(getOracleForeignAccounts).not.toHaveBeenCalled();
  });

  it.each([RECOVERY_BLOCK, RECOVERY_BLOCK + 1])("bypasses Pragma for sender recovery at block %i", async (block) => {
    storageState.block = block;
    const wallet = {
      address: "mtst1wallet",
      importPrivateNote: vi.fn().mockResolvedValue(NOTE_ID),
      requestTransaction: vi.fn().mockResolvedValue("tx-recover"),
      waitForTransaction: vi.fn().mockResolvedValue({}),
    };
    await expect(claimMidenDrop(wallet, envelope(new Uint8Array([1, 7, 9])))).resolves.toBe("tx-recover");
    expect(getOracleForeignAccounts).not.toHaveBeenCalled();
    expect(wallet.requestTransaction.mock.calls[0][0].payload.noteBytes).toBe("AQcJ");
  });

  it("uses raw note bytes when the envelope contains a complete NoteFile", async () => {
    const wallet = {
      address: "mtst1wallet",
      importPrivateNote: vi.fn().mockResolvedValue(NOTE_ID),
      requestTransaction: vi.fn().mockResolvedValue("tx-file"),
      waitForTransaction: vi.fn().mockResolvedValue({}),
    };
    await expect(claimMidenDrop(wallet, envelope(new Uint8Array([3, 7, 9])))).resolves.toBe("tx-file");
    expect(wallet.requestTransaction.mock.calls[0][0].payload.importNotes).toEqual(["AQcJ"]);
  });

  it("rejects links from the previous testnet before requesting wallet actions", async () => {
    const wallet = {
      address: "mtst1wallet",
      importPrivateNote: vi.fn(),
      requestTransaction: vi.fn(),
      waitForTransaction: vi.fn(),
    };
    const legacy = envelope(new Uint8Array([1, 7, 9]));
    delete legacy.midenRelease;
    await expect(claimMidenDrop(wallet, legacy)).rejects.toThrow("older Miden testnet");
    expect(wallet.importPrivateNote).not.toHaveBeenCalled();
    expect(wallet.requestTransaction).not.toHaveBeenCalled();
  });
});
