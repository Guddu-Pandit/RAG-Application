import { langfuse } from "./client";

const FALLBACK_PROMPT = `
You are a document-based assistant.

Rules:
- Answer ONLY using the provided context
- If the answer is not present, say "I don't know"
- Be concise and factual
`;

export async function getSystemPrompt(): Promise<string> {
  try {
    console.log("first")
    const prompt = await langfuse.getPrompt(
      "rag-system-prompt",
      undefined,
      { label: "production" }
    );
    console.log("Second")

    // Langfuse may return undefined
    if (!prompt || !prompt.prompt) {
      return FALLBACK_PROMPT;
    }
    console.log("third")

    return prompt.prompt;
  } catch (error) {
    console.warn(
      "[Langfuse] Prompt fetch failed, using fallback"
    );
    return FALLBACK_PROMPT;
  }
}
