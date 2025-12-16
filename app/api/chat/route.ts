import { NextResponse } from "next/server";
import { embedText } from "@/lib/gemini/embed";
import { generateAnswer } from "@/lib/gemini/generate";
import { index } from "@/lib/pinecone/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    /* 1️⃣ Embed question */
    const embedding = await embedText(message);

    /* 2️⃣ Pinecone search */
    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    /* 3️⃣ Build context */
    const context =
      result.matches
        ?.map((m) => (m.metadata as any)?.text)
        .filter(Boolean)
        .join("\n\n") || "";

    /* 4️⃣ Generate answer */
    const answer = await generateAnswer(message, context);

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
