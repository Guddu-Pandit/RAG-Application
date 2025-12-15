import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generate answer using retrieved context
 */
export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = `
You are a helpful AI assistant.
Answer the question strictly using the provided context.
If the answer is not found in the context, say "I don't know".

CONTEXT:
${context || "No context provided"}

QUESTION:
${question}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
