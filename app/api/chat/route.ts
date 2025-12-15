import { embedText } from "@/lib/rag/embed";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { buildPrompt } from "@/lib/rag/prompt";
import { generateAnswer } from "@/lib/rag/generate";

export async function POST(req: Request) {
  const { message } = await req.json();

  const embedding = await embedText(message);
  const context = await retrieveChunks(embedding);
  const prompt = buildPrompt(context, message);
  const answer = await generateAnswer(prompt);

  return Response.json({ answer });
}
