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

    /* ---------------- RATE LIMIT ---------------- */
    const { data: logs, error: logError } = await supabase
      .from("upload_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (logError) {
      console.error("UPLOAD LOG ERROR:", logError);
    }

    if (logs?.[0]) {
      const last = new Date(logs[0].created_at).getTime();
      if (Date.now() - last < 60_000) {
        return NextResponse.json(
          { error: "Wait 1 minute before uploading again" },
          { status: 429 }
        );
      }
    }

    /* ---------------- FILE ---------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    console.log("FILE:", file.name, file.type);

    /* ---------------- SUPABASE STORAGE ---------------- */
    const uploadPath = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("rag")
      .upload(uploadPath, file);

    if (uploadError) {
      console.error("SUPABASE UPLOAD ERROR:", uploadError);
      throw new Error("Supabase upload failed");
    }

    /* ---------------- TEXT EXTRACTION ---------------- */
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdf = await extractText(buffer);
      text = Array.isArray(pdf.text)
        ? pdf.text.join("\n")
        : "";
    } else {
      const doc = await mammoth.extractRawText({ buffer });
      text = doc.value;
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Unable to extract text (scanned or empty PDF)" },
        { status: 400 }
      );
    }

    console.log("TEXT LENGTH:", text.length);

    /* ---------------- SUMMARY ---------------- */
    const summary = await summarizeText(text);

    await supabase.from("documents").insert({
      filename: file.name,
      summary,
    });

    /* ---------------- VECTOR STORE ---------------- */
    const chunks = chunkText(text);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);

      vectors.push({
        id: `${uploadPath}-${i}`,
        values: embedding,
        metadata: {
          text: chunks[i],
          source: file.name,
        },
      });
    }

    await index.upsert(vectors);

    /* ---------------- LOG SUCCESS ---------------- */
    await supabase.from("upload_logs").insert({});

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("INGEST FAILED:", err);

    return NextResponse.json(
      {
        error: "Ingest failed",
        message: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
