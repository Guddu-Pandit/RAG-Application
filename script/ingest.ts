import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedText } from "@/lib/rag/embed";
import { chunkText } from "@/lib/utils/chunk";

const text = "Your raw document text here";

async function ingest() {
  const chunks = chunkText(text, 800);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);

    await supabaseAdmin.from("document_chunks").insert({
      content: chunk,
      embedding,
    });
  }
}

ingest();
