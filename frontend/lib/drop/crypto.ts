import {
  base64UrlToBytes,
  bytesToBase64Url,
  DROP_AAD,
  DROP_NETWORK,
  DROP_PROTOCOL_VERSION,
  type DropEnvelopeV1,
  type EncryptedDrop,
  isDropEnvelope,
  assertCurrentMidenRelease,
  IncompatibleMidenReleaseError,
} from "./protocol";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export async function encryptDropEnvelope(envelope: DropEnvelopeV1): Promise<EncryptedDrop> {
  if (!isDropEnvelope(envelope)) throw new Error("Invalid drop envelope.");
  assertCurrentMidenRelease(envelope);

  const locatorBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const plaintext = textEncoder.encode(JSON.stringify(envelope));

  try {
    const ciphertext = await crypto.subtle.encrypt({
      name: "AES-GCM",
      iv: nonceBytes,
      additionalData: textEncoder.encode(DROP_AAD),
      tagLength: 128,
    }, key, plaintext);

    return {
      version: DROP_PROTOCOL_VERSION,
      locator: bytesToBase64Url(locatorBytes),
      key: bytesToBase64Url(keyBytes),
      nonce: bytesToBase64Url(nonceBytes),
      ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    };
  } finally {
    plaintext.fill(0);
    keyBytes.fill(0);
  }
}

export async function decryptDropEnvelope(
  keyValue: string,
  nonceValue: string,
  ciphertextValue: string,
): Promise<DropEnvelopeV1> {
  const keyBytes = base64UrlToBytes(keyValue);
  const nonce = base64UrlToBytes(nonceValue);
  const ciphertext = base64UrlToBytes(ciphertextValue);
  if (keyBytes.byteLength !== 32 || nonce.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new Error("Invalid encrypted drop.");
  }

  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  keyBytes.fill(0);
  const decrypt = (aad: string) => crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: nonce,
    additionalData: textEncoder.encode(aad),
    tagLength: 128,
  }, key, ciphertext);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await decrypt(DROP_AAD);
  } catch (error) {
    // Authenticate legacy links only to explain their incompatibility. Never
    // deserialize their notes or offer them to a mainnet wallet.
    try {
      const legacy = new Uint8Array(await decrypt("miden-drop:v1:testnet"));
      legacy.fill(0);
    } catch {
      throw error;
    }
    throw new IncompatibleMidenReleaseError();
  }

  const plaintextBytes = new Uint8Array(plaintext);
  try {
    const parsed = JSON.parse(textDecoder.decode(plaintextBytes)) as unknown;
    if (!isDropEnvelope(parsed) || parsed.network !== DROP_NETWORK) {
      throw new Error("Unsupported drop envelope.");
    }
    assertCurrentMidenRelease(parsed);
    return parsed;
  } finally {
    plaintextBytes.fill(0);
  }
}
