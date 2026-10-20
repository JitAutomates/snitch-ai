/** Fixed wording — only interpolate variables; do not edit prose casually. */
export function buildPeerResolverQuery(input: {
  industry: string;
  product: string;
  region: string;
  scale: string;
  sales: string;
}): string {
  const { industry, product, region, scale, sales } = input;
  return (
    `Find up to 10 real operating competitor companies for a startup ` +
    `in the ${industry} industry whose main product or service is ${product}. ` +
    `Prefer companies relevant to ${region}. ` +
    `Target peers similar in company scale to ${scale} ` +
    `and from roughly 50% to 200% of annual sales volume about ${sales} (same currency if known). ` +
    `Exclude pure news sites, directories, and dead projects. ` +
    `Return distinct companies only.`
  );
}

export const PEER_RESOLVER_NUM_RESULTS = 10;
