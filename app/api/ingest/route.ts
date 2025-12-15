import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { embedText } from "@/lib/rag/embed";
import { chunkText } from "@/lib/utils/chunk";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function POST(req: Request) {
  const supabase = await createServerClientSupabase(); // ✅ FIX
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // 1️⃣ Upload to Supabase Storage
  const filePath = `${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("rag")
    .upload(filePath, file, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 2️⃣ Extract text
// Convert once
const arrayBuffer = await file.arrayBuffer();

// For PDF (unpdf requires Uint8Array)
const uint8 = new Uint8Array(arrayBuffer);

// For DOC/DOCX (mammoth requires Buffer)
const nodeBuffer = Buffer.from(arrayBuffer);

let text = "";

if (file.name.endsWith(".pdf")) {
  const result = await extractText(uint8);

  if (typeof result === "string") {
    text = result;
  } else if (Array.isArray(result?.text)) {
    text = result.text.join("\n");
  } else {
    throw new Error("PDF text extraction failed");
  }
} else {
  const doc = await mammoth.extractRawText({ buffer: nodeBuffer });
  text = doc.value;
}


  // 3️⃣ Chunk → Embed → Store
  const chunks = chunkText(text);

for (const chunk of chunks) {
  const embedding = await embedText(chunk);

  const { data,error } = await supabase.from("documents").insert({
    title: file.name,
    content: chunk,
    embedding,
  });

  if (error) {
    console.error("DB INSERT ERROR:", error);
    throw error;
  }
}


  return NextResponse.json({ success: true });
}
