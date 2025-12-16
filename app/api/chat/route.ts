import { NextResponse } from "next/server";
import { embedText } from "@/lib/gemini/embed";
import { generateAnswer } from "@/lib/gemini/generate";
import { index } from "@/lib/pinecone/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("📩 Chat request received");

    const body = await req.json();
    console.log("📦 Body:", body);

    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    console.log("🧠 Embedding query...");
    const embedding = await embedText(message);
    console.log("✅ Embedding length:", embedding.length);

    console.log("🔍 Querying Pinecone...");
    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log(
      "📊 Matches found:",
      result.matches?.length ?? 0
    );

    if (!result.matches || result.matches.length === 0) {
      console.warn("⚠️ No relevant chunks found");
    }

    const context =
      result.matches
        ?.map((m) => (m.metadata as any)?.text)
        .filter(Boolean)
        .join("\n\n") || "";

    console.log("📄 Context length:", context.length);

    console.log("✍️ Generating answer...");
    const answer = await generateAnswer(message, context);

    console.log("✅ Answer generated");

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("❌ Chat API error:", err?.message || err);
    console.error(err?.stack);

    return NextResponse.json(
      { error: err?.message || "Chat failed" },
      { status: 500 }
    );
  }
}
