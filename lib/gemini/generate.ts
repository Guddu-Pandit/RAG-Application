import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function summarizeText(text: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
  });

  const result = await model.generateContent(
    `Summarize this document clearly and briefly:\n\n${text.slice(0, 12000)}`
  );

  return result.response.text();
}
