import { NextResponse } from "next/server";
import { createServer } from "@/utils/supabase/server";
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

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

if (file.name.endsWith(".pdf")) {
  const pdfResult = await extractText(buffer);
  text = pdfResult.text.join("\n");
} else {
  const result = await mammoth.extractRawText({ buffer });
  text = result.value;
}


  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);

    await supabase.from("documents").insert({
      content: chunk,
      embedding,
    });
  }

  return NextResponse.json({ success: true });
}
