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
  const supabase = createServerClientSupabase();

  /* ⏱ Rate limit */
  const { data: logs } = await supabase
    .from("upload_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (logs?.[0]) {
    const last = new Date(logs[0].created_at).getTime();
    if (Date.now() - last < 60_000) {
      return NextResponse.json(
        { error: "Wait 1 minute before uploading again" },
        { status: 429 }
      );
    }
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  /* Upload */
  await supabase.storage.from("rag").upload(`${Date.now()}-${file.name}`, file);

  const arrayBuffer = await file.arrayBuffer();
  let text = "";

  if (file.name.endsWith(".pdf")) {
    // ✅ unpdf requires Uint8Array
    const res = await extractText(new Uint8Array(arrayBuffer));

    if (typeof res === "string") {
      text = res;
    } else if (Array.isArray(res?.text)) {
      text = res.text.join("\n");
    }
  } else {
    // ✅ mammoth requires Buffer
    const res = await mammoth.extractRawText({
      buffer: Buffer.from(arrayBuffer),
    });
    text = res.value;
  }

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Unable to extract text from PDF (scanned PDF)" },
      { status: 400 }
    );
  }

  if (!text.trim()) throw new Error("Empty document");

  /* Summary */
  const summary = await summarizeText(text);

  await supabase.from("documents").insert({
    filename: file.name,
    summary,
  });

  /* Vector store */
  const chunks = chunkText(text);

  const vectors = await Promise.all(
    chunks.map(async (chunk, i) => ({
      id: `${file.name}-${i}`,
      values: await embedText(chunk),
      metadata: { text: chunk },
    }))
  );

  await index.upsert(vectors);

  await supabase.from("upload_logs").insert({});

  return NextResponse.json({ success: true, summary });
}
