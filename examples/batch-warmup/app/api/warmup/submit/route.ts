import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

const PRECISION_PROMPT =
  "Virtual try-on: keep the person's face, body, skin tone, hair, and pose exactly as they are. Only replace the clothing with the garment shown in the reference image. Do not alter the person's appearance in any way.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clothingFile = formData.get("clothing") as File | null;
    const personFile = formData.get("person") as File | null;

    if (!clothingFile || !personFile) {
      return NextResponse.json(
        { error: "Both clothing and person images are required" },
        { status: 400 }
      );
    }

    const [clothingUrl, personUrl] = await Promise.all([
      fal.storage.upload(clothingFile),
      fal.storage.upload(personFile),
    ]);

    const { request_id } = await fal.queue.submit(
      "fal-ai/nano-banana-pro/edit",
      {
        input: {
          prompt: PRECISION_PROMPT,
          image_urls: [clothingUrl, personUrl],
        },
      }
    );

    return NextResponse.json({ requestId: request_id });
  } catch (error) {
    console.error("Warmup submit failed:", error);
    return NextResponse.json(
      { error: "Warmup submit failed" },
      { status: 500 }
    );
  }
}
