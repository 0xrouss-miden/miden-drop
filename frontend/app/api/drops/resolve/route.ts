import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { decodeResolveDropRequest, encodeBase64Url, InvalidDropRequestError } from "@/lib/server/drop-request";
import { resolveEncryptedDrop } from "@/lib/server/drops";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request) {
  try {
    const { locator } = decodeResolveDropRequest(await request.json());
    const drop = await resolveEncryptedDrop(locator);
    if (!drop) return notFound();

    return NextResponse.json({
      version: drop.version,
      nonce: encodeBase64Url(drop.nonce),
      ciphertext: encodeBase64Url(drop.ciphertext),
    }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    if (error instanceof ZodError || error instanceof InvalidDropRequestError || error instanceof SyntaxError) {
      return notFound();
    }
    return NextResponse.json({ error: "The encrypted drop could not be retrieved." }, { status: 500, headers: RESPONSE_HEADERS });
  }
}

function notFound() {
  return NextResponse.json({ error: "Drop not found." }, { status: 404, headers: RESPONSE_HEADERS });
}
