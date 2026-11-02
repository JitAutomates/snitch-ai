/** Fixed templates — only interpolate profile fields. */

export function buildNicheNewsSearchQuery(input: {
  industry: string;
  product: string;
  region: string;
}): string {
  const { industry, product, region } = input;
  return (
    `${industry} startup news ${region} ` +
    `${product} competitors funding regulation market ` +
    `last 7 days`
  );
}

export function buildNicheNewsSystemPrompt(): string {
  return (
    `You write short niche news for Hong Kong startup founders. ` +
    `Output ONLY valid JSON: {"articles":[{"tag":"Funding|Policy|Market|Talent|Competition","headline":"...","body":"..."}]}. ` +
    `Exactly 3 articles. Headlines under 110 characters. Body 2-4 sentences, factual tone, no hype. ` +
    `Use only the provided search snippets; if weak evidence, stay cautious. No markdown.`
  );
}

export function buildNicheNewsUserPrompt(input: {
  industry: string;
  product: string;
  region: string;
  searchContext: string;
}): string {
  return (
    `Industry: ${input.industry}\n` +
    `Product: ${input.product}\n` +
    `Region focus: ${input.region}\n\n` +
    `Search material:\n${input.searchContext}\n\n` +
    `Write 3 niche news articles relevant to this founder.`
  );
}

export const NICHE_NEWS_ARTICLE_COUNT = 3;
