import { NextResponse } from "next/server";
import { embedText } from "@/lib/gemini/embed";
import { generateAnswer } from "@/lib/gemini/generate";
import { index } from "@/lib/pinecone/client";

export async function POST(req: Request) {
  const { message } = await req.json();

  const embedding = await embedText(message);

  const res = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  const context =
    res.matches?.map(m => m.metadata?.text).join("\n") || "";

  const answer = await generateAnswer(message, context);

  return NextResponse.json({ answer });
}
