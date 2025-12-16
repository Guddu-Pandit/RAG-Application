import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function summarizeText(text: string): Promise<string> {
  if (!text.trim()) return "No content to summarize.";

  try {
    const prompt = `
Summarize the following document clearly and concisely:

${text.slice(0, 15000)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // ✅ New SDK model
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    return response.text?.trim() || "No summary generated.";
  } catch (err: any) {
    console.error("❌ Summarization failed:", err.message);
    return "Failed to summarize document.";
  }
}
