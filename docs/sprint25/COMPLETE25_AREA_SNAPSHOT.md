# Create area-context acquisition identity

The validated Next cache previously stored raw provider payload, then normalization assigned a new `acquiredAt` for every consumer. Thus identical cached data acquired a different full context hash, preventing honest prebound Create acceptance and overstating source freshness.

The cache now stores validated payload and its original acquisition time together (versioned key v3). Normalization preserves that time. A platform-stale entry at or beyond fifteen minutes is rejected with a retryable source error; no new timestamp, empty result, hash exclusion or automatic direct retry is substituted. Provider query, cancellation, byte caps, privacy scope and access enforcement are unchanged. Injected test loaders remain fresh acquisitions and cross the same payload validation boundary.

Regression: real resolver and a deterministic mocked framework cache at acquisition+30 seconds return identical full context; acquisition+900 seconds rejects. Invalid HTTP200 runtime errors still never enter the cache, and a subsequent valid empty response remains honest empty coverage. This is offline cache/contract evidence, not a claim about live provider availability or physical platform deletion.
