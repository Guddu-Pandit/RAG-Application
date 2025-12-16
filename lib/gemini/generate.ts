import { GoogleGenAI } from "@google/genai";
import { getSystemPrompt } from "@/lib/langfuse/prompt";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function generateAnswer(
  traceId: string,
  question: string,
  context: string
): Promise<string> {
  try {
    const systemPrompt = await getSystemPrompt();

    const prompt = `
${systemPrompt}

Context:
${context || "No context available"}

Question:
${question}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // ✅ VALID
      contents: prompt,
    });

    return response.text || "No answer generated.";
  } catch (err: any) {
    console.error("❌ Gemini generate failed:", err.message);
    return "Sorry, I couldn’t generate an answer at the moment.";
  }
}
