import { GoogleGenAI } from "@google/genai";
import { langfuse } from "@/lib/langfuse/client";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function embedText(
  traceId: string,
  text: string
): Promise<number[]> {
  const span = langfuse.span({
    traceId,
    name: "embed_text",
    input: { length: text.length },
  });

  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001", // correct new-SDK embedding model
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
      config: { 
        outputDimensionality: 768
      },
    });

    if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error("No embeddings returned");
    }

    // ✅ Extract first embedding vector
    const vector = result.embeddings[0].values;

    if (!vector) {
      throw new Error("Embedding vector is undefined");
    }
    span.end({
      output: { dimensions: vector.length },
    });

    return vector;
  } catch (err: any) {
    console.error("❌ Embedding failed:", err.message);

    // ✅ Langfuse-safe error reporting
    span.end({
      metadata: { error: err.message },
    });

    // NEVER break ingestion
    return [];
  }
}
