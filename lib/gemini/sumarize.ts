import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function summarizeText(text: string): Promise<string> {
  if (!text.trim()) return "No content to summarize.";

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = `
Summarize the following document clearly and concisely:

${text.slice(0, 15000)}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
