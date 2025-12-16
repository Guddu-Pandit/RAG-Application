import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { chunkText } from "@/lib/utils/chunk";
import { embedText } from "@/lib/gemini/embed";
import { summarizeText } from "@/lib/gemini/sumarize";
import { index } from "@/lib/pinecone/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = createServerClientSupabase();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    /* 1️⃣ Upload file to Supabase bucket */
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

    /* 3️⃣ Optional summary */
    let summary = "Summary unavailable";
    try {
      summary = await summarizeText(text);
    } catch (e) {
      console.error("Summary failed", e);
    }

    await supabase.from("documents").insert({
      filename: file.name,
      summary,
      path: filePath,
    });

    /* 4️⃣ Chunk + Embed + Pinecone */
    const chunks = chunkText(text);

    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => ({
        id: `${filePath}-${i}`,
        values: await embedText(chunk),
        metadata: {
          text: chunk,
          source: file.name,
        },
      }))
    );

    await index.upsert(vectors);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: "Failed to ingest document" },
      { status: 500 }
    );
  }
}
