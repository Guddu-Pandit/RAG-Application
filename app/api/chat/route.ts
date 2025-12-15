import { NextResponse } from "next/server";
import { embedText } from "@/lib/gemini/embed";
import { generateAnswer } from "@/lib/gemini/generate";
import { index } from "@/lib/pinecone/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 1. Embed user query
    const embedding = await embedText(message);

    // 2. Vector search
    const res = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // 3. Build context safely
    const context =
      res.matches
        ?.map(
          (m) => (m.metadata as { text?: string })?.text
        )
        .filter(Boolean)
        .join("\n\n") ?? "";

    // 4. Generate answer
    const answer = await generateAnswer(message, context);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
