import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aide-dashboard-config-v1";

export type WidgetId =
  | "inbox"
  | "metrics"
  | "leakage"
  | "focus"
  | "operations"
  | "quotes_queue"
  | "tasks"
  | "notes";

export interface DashboardConfig {
  order: WidgetId[];
  hidden: WidgetId[];
}

const DEFAULT_ORDER: WidgetId[] = [
  "inbox",
  "metrics",
  "leakage",
  "focus",
  "operations",
  "quotes_queue",
  "tasks",
  "notes",
];

const DEFAULT_CONFIG: DashboardConfig = {
  order: DEFAULT_ORDER,
  hidden: [],
};

function load(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    const order = Array.isArray(parsed.order)
      ? (parsed.order.filter((id) => DEFAULT_ORDER.includes(id)) as WidgetId[])
      : DEFAULT_ORDER;
    const missing = DEFAULT_ORDER.filter((id) => !order.includes(id));
    const hidden = Array.isArray(parsed.hidden)
      ? (parsed.hidden.filter((id) => DEFAULT_ORDER.includes(id)) as WidgetId[])
      : [];
    return { order: [...order, ...missing], hidden };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function save(config: DashboardConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(load);

  useEffect(() => {
    save(config);
  }, [config]);

  const moveUp = useCallback((id: WidgetId) => {
    setConfig((prev) => {
      const idx = prev.order.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev.order];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return { ...prev, order: next };
    });
  }, []);

  const moveDown = useCallback((id: WidgetId) => {
    setConfig((prev) => {
      const idx = prev.order.indexOf(id);
      if (idx < 0 || idx >= prev.order.length - 1) return prev;
      const next = [...prev.order];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return { ...prev, order: next };
    });
  }, []);

  const toggle = useCallback((id: WidgetId) => {
    setConfig((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id)
        ? prev.hidden.filter((x) => x !== id)
        : [...prev.hidden, id],
    }));
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const isHidden = useCallback(
    (id: WidgetId) => config.hidden.includes(id),
    [config.hidden],
  );

  return { config, moveUp, moveDown, toggle, isHidden, reset };
}

export const WIDGET_LABELS: Record<WidgetId, string> = {
  inbox: "Inbox",
  metrics: "Metrics",
  leakage: "Revenue Leakage",
  focus: "Today's Focus",
  operations: "Operations",
  quotes_queue: "Quotes To Do",
  tasks: "Tasks",
  notes: "Notes",
};
