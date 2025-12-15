export function buildPrompt(context: string, question: string) {
  return `
You are a helpful assistant.
Answer ONLY using the context below.

Context:
${context}

Question:
${question}
`;
}
