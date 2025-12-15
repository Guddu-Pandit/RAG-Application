import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("➡️ INGEST API HIT");

  try {
    const supabase = await createServerClientSupabase();
    console.log("✅ Supabase client created");

    const formData = await req.formData();
    console.log("✅ FormData read");

    const file = formData.get("file") as File;
    console.log("📄 File:", file?.name, file?.type);

    if (!file) {
      throw new Error("No file received");
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log("✅ arrayBuffer read");

    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const result = await extractText(new Uint8Array(arrayBuffer));
      console.log("📘 PDF extract result type:", typeof result);

      if (typeof result === "string") {
        text = result;
      } else if (Array.isArray(result?.text)) {
        text = result.text.join("\n");
      } else {
        throw new Error("PDF text extraction failed");
      }
    } else {
      const doc = await mammoth.extractRawText({
        buffer: Buffer.from(arrayBuffer),
      });
      text = doc.value;
    }

    console.log("📝 Extracted text length:", text.length);

    if (!text.trim()) {
      throw new Error("Extracted text is empty");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ INGEST ERROR:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
