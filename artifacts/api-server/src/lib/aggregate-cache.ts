/**
 * Single fan-out point for invalidating aggregate-snapshot caches whenever
 * underlying tables (wip, jobs, invoices, quotes, defects, todos) mutate.
 *
 * Call this from POST/PATCH/DELETE handlers on those tables so the dashboard
 * sees fresh numbers immediately instead of waiting up to 30s for the cache
 * TTL to expire.
 *
 * Cheap: each underlying invalidator is just `map.clear()`. Safe to call on
 * every write — no batching/debouncing needed.
 */
import { invalidateAnalyticsCache } from "../routes/analytics";
import { invalidateKpiCache } from "../routes/kpi";

export function invalidateAggregateCaches() {
  invalidateAnalyticsCache();
  invalidateKpiCache();
}
