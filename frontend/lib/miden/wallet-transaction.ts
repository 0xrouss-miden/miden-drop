import type { WalletContextState } from "@miden-sdk/miden-wallet-adapter-react";

type FeeWallet = Pick<WalletContextState, "requestGuardianInfo">;
const FELT_MODULUS = BigInt("18446744069414584321");

export async function createWalletTransactionBuilder(
  wallet: FeeWallet,
  sdk: typeof import("@miden-sdk/miden-sdk/lazy"),
) {
  if (!wallet.requestGuardianInfo) {
    throw new Error("The connected wallet cannot report its account type. Update your wallet before creating a transaction.");
  }
  const { isGuardianAccount } = await wallet.requestGuardianInfo();
  const builder = new sdk.TransactionRequestBuilder();
  if (!isGuardianAccount) return builder;

  // The executing account lives in the extension, so the app's public-chain client
  // cannot use feeAwareTransactionRequestBuilder(account). Declare the replay salt
  // here and let the wallet commit the fee info and coordinate guardian signatures.
  // Generate a new salt per request, never per session or per account.
  try {
    const elements = new BigUint64Array(4);
    const sample = new BigUint64Array(1);
    for (let index = 0; index < elements.length; index++) {
      do { crypto.getRandomValues(sample); } while (sample[0] >= FELT_MODULUS);
      elements[index] = sample[0];
    }
    const salt = new sdk.Word(elements);
    try {
      return builder.withFeeConversionSalt(salt);
    } finally {
      salt.free();
    }
  } finally {
    builder.free();
  }
}
