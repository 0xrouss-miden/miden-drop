import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { decodeCreateDropRequest, InvalidDropRequestError } from "@/lib/server/drop-request";
import { DropAlreadyExistsError, storeEncryptedDrop } from "@/lib/server/drops";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request) {
  try {
    const body = await readJsonWithLimit(request);
    const { locator, nonce, ciphertext } = decodeCreateDropRequest(body);
    await storeEncryptedDrop(locator, nonce, ciphertext);
    return NextResponse.json({ stored: true }, { status: 201, headers: RESPONSE_HEADERS });
  } catch (error) {
    if (error instanceof DropAlreadyExistsError) {
      return NextResponse.json({ error: "Drop already exists." }, { status: 409, headers: RESPONSE_HEADERS });
    }
    if (error instanceof ZodError || error instanceof InvalidDropRequestError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid encrypted drop." }, { status: 400, headers: RESPONSE_HEADERS });
    }
    return NextResponse.json({ error: "The encrypted drop could not be stored." }, { status: 500, headers: RESPONSE_HEADERS });
  }
}

async function readJsonWithLimit(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 360 * 1024) throw new InvalidDropRequestError();
  const text = await request.text();
  if (text.length > 360 * 1024) throw new InvalidDropRequestError();
  return JSON.parse(text) as unknown;
}
