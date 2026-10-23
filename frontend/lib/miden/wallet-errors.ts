type WalletAction = "connect" | "disconnect" | "create" | "claim";

const approvalMessages: Record<WalletAction, string> = {
  connect: "The connection was not approved in Bread. Try again and approve the connection in your wallet.",
  disconnect: "Bread did not approve the disconnect request. Try again in your wallet.",
  create: "Drop creation was not approved in Bread. Try again and approve the request in your wallet.",
  claim: "The wallet request was not approved in Bread. Try again and approve the note import and claim in your wallet.",
};

export function isWalletApprovalError(error: unknown): boolean {
  // The adapter wraps the original wallet error in `.error`; other callers can
  // use the standard Error.cause. Inspect only those known error fields.
  const pending: unknown[] = [error];
  const seen = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (typeof current === "string") {
      if (/\b(?:NOT[_ -]?GRANTED|USER[_ -](?:REJECTED|DENIED|CANCELLED|CANCELED)|ACTION_REJECTED|WalletWindowClosedError)\b/iu.test(current)
        || /\buser (?:rejected|denied|cancelled|canceled)\b|\b(?:rejected|denied|cancelled|canceled) by (?:the )?user\b/iu.test(current)) return true;
    } else if (current && typeof current === "object" && !seen.has(current)) {
      seen.add(current);
      const detail = current as Record<string, unknown>;
      pending.push(detail.name, detail.message, detail.code, detail.error, detail.cause);
    }
  }
  return false;
}

export function walletApprovalMessage(error: unknown, action: WalletAction): string | undefined {
  return isWalletApprovalError(error) ? approvalMessages[action] : undefined;
}

export function reportWalletError(error: unknown) {
  // Expected refusals are shown by the action's catch handler. The provider's
  // default console.error would also trigger Next.js's development error overlay.
  // Keep diagnostics for real failures instead of silencing the whole adapter.
  if (!isWalletApprovalError(error)) console.error(error);
}

export function toCreationError(error: unknown, noteWasCreated: boolean, tokenSymbol: string) {
  if (noteWasCreated) return "The transaction is confirmed, but the encrypted link could not be stored. Retry without closing this page.";
  const approvalMessage = walletApprovalMessage(error, "create");
  if (approvalMessage) return approvalMessage;
  const message = error instanceof Error ? error.message : "";
  if (/insufficient|balance/iu.test(message)) return `Your wallet does not have enough ${tokenSymbol} for this drop.`;
  if (/network|fetch|rpc|offline|timeout/iu.test(message)) return "Miden Mainnet (Cedar) could not be reached. Check your wallet’s transaction status before trying again.";
  return message || "The wallet could not create this drop. Check your wallet’s transaction status before trying again.";
}
