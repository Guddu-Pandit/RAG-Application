import { supabaseAdmin } from "@/lib/supabase/admin";

export async function retrieveChunks(embedding: number[]) {
  const { data } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: embedding,
    match_count: 5,
  });
  return (
    (data as { content: string }[])
      ?.map((d) => d.content)
      .join("\n") || ""
  );
}
