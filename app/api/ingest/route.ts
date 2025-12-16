import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunk";
import { embedText } from "@/lib/gemini/embed";
import { summarizeText } from "@/lib/gemini/sumarize";
import { index } from "@/lib/pinecone/client";
import { langfuse } from "@/lib/langfuse/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const trace = langfuse.trace({
    name: "document_ingest",
  });

  try {
    const supabase = createServerClientSupabase();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 300 }
      );
    }

    /* 1️⃣ Upload file to Supabase */
    const filePath = `${Date.now()}-${file.name}`;
    await supabase.storage.from("rag").upload(filePath, file);

    /* 2️⃣ Extract text */
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.endsWith(".pdf")) {
      const res = await extractText(new Uint8Array(buffer));
      text = typeof res === "string" ? res : res.text.join("\n");
    } else {
      const res = await mammoth.extractRawText({ buffer });
      text = res.value;
    }

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "Unable to extract text" },
        { status: 400 }
      );
    }

    /* 3️⃣ Summarize */
    let summary = "Summary unavailable";
    try {
      summary = await summarizeText(text);
    } catch (e) {
      langfuse.event({
        traceId: trace.id,
        name: "summary_failed",
      });
    }

    await supabase.from("documents").insert({
      filename: file.name,
      summary,
      path: filePath,
    });

 /* 4️⃣ Chunk + Embed + Pinecone */
const chunks = chunkText(text);

const vectors = [];

for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i];

  const embedding = await embedText(trace.id, chunk);

  // 🚨 CRITICAL CHECK
  if (!embedding || embedding.length === 0) {
    console.error("❌ Empty embedding for chunk", i);

    langfuse.event({
      traceId: trace.id,
      name: "empty_embedding",
      metadata: { chunkIndex: i },
    });

    continue;
  }

  vectors.push({
    id: `${filePath}-${i}`,
    values: embedding,
    metadata: {
      text: chunk.slice(0, 1000), // 🔥 limit metadata size
      source: file.name,
      chunkIndex: i,
    },
  });
}

console.log("📦 VECTORS READY:", {
  count: vectors.length,
  dimension: vectors[0]?.values?.length,
});

if (vectors.length === 0) {
  throw new Error("No valid vectors to upsert");
}

try {
  const upsertResponse = await index.upsert(vectors);
  console.log("✅ Pinecone upsert response:", upsertResponse);
} catch (err: any) {
  console.error("❌ Pinecone upsert failed:", err);

  langfuse.event({
    traceId: trace.id,
    name: "pinecone_upsert_failed",
    metadata: {
      message: err.message,
      stack: err.stack,
    },
  });

  throw err;
}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    langfuse.event({
      traceId: trace.id,
      name: "ingest_error",
      metadata: {
        message: err?.message,
      },
    });

    return NextResponse.json(
      { error: "Failed to ingest document" },
      { status: 500 }
    );
  }
}
