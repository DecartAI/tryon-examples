import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 }
    );
  }

  try {
    const status = await fal.queue.status("fal-ai/nano-banana-pro/edit", {
      requestId,
      logs: false,
    });

    if (status.status !== "COMPLETED") {
      return NextResponse.json({ status: status.status });
    }

    const result = await fal.queue.result("fal-ai/nano-banana-pro/edit", {
      requestId,
    });

    const outputUrl = (result.data as { images: { url: string }[] }).images[0]
      .url;

    const imageRes = await fetch(outputUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Warmup result fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 }
    );
  }
}
