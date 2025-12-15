 // Split text into overlapping chunks for RAG
export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100
): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end).trim();

    if (chunk) chunks.push(chunk);

    start += chunkSize - overlap;
  }

  return chunks;
}
