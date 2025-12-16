import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  if (!context.trim()) {
    return "I don't know.";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", 
  });

  const prompt = `
You are a document-based assistant.
Answer ONLY using the context.
If the answer is not present, say "I don't know".

Context:
${context}

Question:
${question}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
