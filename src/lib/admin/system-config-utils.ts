/**
 * Utilities for system_config merge logic.
 * Used by /api/admin/system/config for scope resolution.
 *
 * @module lib/admin/system-config-utils
 */

export interface SystemConfigRow {
  config_key: string;
  organization_id: string | null;
  branch_id: string | null;
  [k: string]: unknown;
}

/**
 * Merge configs by scope: branch > org > global.
 * Returns one config per config_key, keeping the highest-priority value.
 *
 * @param configs - Raw config rows from system_config (may include duplicates across scopes)
 * @returns Deduplicated configs, one per config_key, with branch overriding org overriding global
 */
export function mergeConfigsByScope(
  configs: Array<SystemConfigRow>,
): SystemConfigRow[] {
  const byKey = new Map<
    string,
    { config: SystemConfigRow; priority: number }
  >();
  for (const c of configs) {
    const priority =
      c.branch_id != null ? 3 : c.organization_id != null ? 2 : 1;
    const existing = byKey.get(c.config_key);
    if (!existing || priority > existing.priority) {
      byKey.set(c.config_key, { config: c, priority });
    }
  }
  return Array.from(byKey.values()).map(({ config }) => config);
}
