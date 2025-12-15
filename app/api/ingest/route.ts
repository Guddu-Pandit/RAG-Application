import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { embedText } from "@/lib/rag/embed";
import { chunkText } from "@/lib/utils/chunk";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function POST(req: Request) {
  const supabase = await createServer();
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // 1️⃣ Upload to Supabase Storage (bucket: tech)
  const filePath = `${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("tech")
    .upload(filePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 2️⃣ Extract text
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  if (file.name.endsWith(".pdf")) {
    const pdf = await extractText(buffer);
    text = pdf.text.join("\n");
  } else {
    const doc = await mammoth.extractRawText({ buffer });
    text = doc.value;
  }

  // 3️⃣ Chunk + Embed + Store
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);

    await supabase.from("documents").insert({
      title: file.name,
      content: chunk,
      embedding,
    });
  }

  return NextResponse.json({ success: true });
}
