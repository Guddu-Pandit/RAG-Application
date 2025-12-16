import { NextResponse } from "next/server";
import { langfuse } from "@/lib/langfuse/client";
import { embedText } from "@/lib/gemini/embed";
import { generateAnswer } from "@/lib/gemini/generate";
import { index } from "@/lib/pinecone/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // ✅ Create trace (NO .end() on traces)
  const trace = langfuse.trace({
    name: "chat_request",
  });

  try {
    const { message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    /* 🔹 Embed */
    const embedding = await embedText(trace.id, message);

    /* 🔹 Retrieve */
    const retrieveSpan = langfuse.span({
      traceId: trace.id,
      name: "pinecone_retrieve",
      input: { topK: 5 },
    });

    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // ✅ END SPAN (correct)
    retrieveSpan.end({
      output: {
        matches: result.matches?.length ?? 0,
      },
    });

    const context =
      result.matches
        ?.map((m) => (m.metadata as any)?.text)
        .filter(Boolean)
        .join("\n\n") || "";

    /* 🔹 RAG decision logging */
    langfuse.event({
      traceId: trace.id,
      name: "rag_decision",
      metadata: {
        usedRAG: Boolean(context),
        contextLength: context.length,
      },
    });

    /* 🔹 Generate */
    const answer = await generateAnswer(
      trace.id,
      message,
      context
    );

    return NextResponse.json({ answer });
  } catch (err: any) {
    // ✅ Log error WITHOUT crashing
    langfuse.event({
      traceId: trace.id,
      name: "error",
      metadata: {
        message: err?.message ?? "unknown error",
      },
    });

    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
