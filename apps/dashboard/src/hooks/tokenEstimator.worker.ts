export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateTokensBatch(texts: string[]): number[] {
  return texts.map(estimateTokens);
}
