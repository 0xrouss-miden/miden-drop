import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletTransactionError, WalletWindowClosedError } from "@miden-sdk/miden-wallet-adapter-base";

import { isWalletApprovalError, reportWalletError, toCreationError, walletApprovalMessage } from "./wallet-errors";

afterEach(() => vi.restoreAllMocks());

describe("wallet approval errors", () => {
  it.each([
    new WalletTransactionError("NOT_GRANTED"),
    new WalletTransactionError("Request failed", { code: "NOT_GRANTED" }),
    new Error("Request failed", { cause: new Error("NOT_GRANTED") }),
    new WalletWindowClosedError(),
    "User rejected the request",
    new Error("Request cancelled by the user"),
  ])("recognizes a refused wallet request: %s", (error) => {
    expect(isWalletApprovalError(error)).toBe(true);
    expect(toCreationError(error, false, "MID")).toBe("Drop creation was not approved in Bread. Try again and approve the request in your wallet.");
  });

  it("handles cyclic adapter errors without hiding unexpected failures", () => {
    const error = new WalletTransactionError("Proof verification failed");
    error.error = error;
    expect(isWalletApprovalError(error)).toBe(false);
  });

  it("avoids the provider's console error overlay only for expected refusals", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    reportWalletError(new WalletTransactionError("NOT_GRANTED"));
    expect(consoleError).not.toHaveBeenCalled();

    const unexpected = new WalletTransactionError("Transaction rejected: invalid proof");
    reportWalletError(unexpected);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(unexpected);
    expect(toCreationError(unexpected, false, "MID")).toBe(unexpected.message);
  });

  it("keeps recovery guidance when the note has already been confirmed", () => {
    expect(toCreationError(new WalletTransactionError("NOT_GRANTED"), true, "MID"))
      .toBe("The transaction is confirmed, but the encrypted link could not be stored. Retry without closing this page.");
  });

  it("provides action-specific approval guidance", () => {
    const error = new Error("NOT_GRANTED");
    expect(walletApprovalMessage(error, "connect")).toContain("approve the connection");
    expect(walletApprovalMessage(error, "claim")).toContain("approve the note import and claim");
    expect(walletApprovalMessage(error, "disconnect")).toContain("disconnect request");
    expect(walletApprovalMessage(new Error("RPC permission denied"), "claim")).toBeUndefined();
  });

  it("does not claim funds are unchanged after an unknown or network failure", () => {
    expect(toCreationError(new Error("Confirmation timeout"), false, "MID")).toContain("Check your wallet’s transaction status");
    expect(toCreationError(undefined, false, "MID")).toContain("Check your wallet’s transaction status");
    expect(toCreationError(new Error("Insufficient balance"), false, "USDC")).toContain("enough USDC");
  });
});
