import "server-only";

import {
  PointObjectWikidataAdapter,
  type PointObjectWikidataResolution,
  type ResolvePointObjectWikidataInput
} from "./point-to-object-wikidata-contract";

const adapter = new PointObjectWikidataAdapter();

/**
 * Resolves at most one exact QID already carried by the selected OSM record.
 * It fails soft so the separately sourced OSM evidence remains usable.
 */
export async function resolvePointObjectWikidata(
  input: ResolvePointObjectWikidataInput
): Promise<PointObjectWikidataResolution> {
  return adapter.resolve(input);
}
