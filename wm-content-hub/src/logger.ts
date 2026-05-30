type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = order[(process.env.LOG_LEVEL as Level) ?? "info"] ?? order.info;

function emit(level: Level, msg: string, extra?: unknown): void {
  if (order[level] < threshold) return;
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  if (extra !== undefined) {
    console.log(`${ts} ${tag} ${msg}`, typeof extra === "string" ? extra : JSON.stringify(extra));
  } else {
    console.log(`${ts} ${tag} ${msg}`);
  }
}

export const log = {
  debug: (m: string, e?: unknown) => emit("debug", m, e),
  info: (m: string, e?: unknown) => emit("info", m, e),
  warn: (m: string, e?: unknown) => emit("warn", m, e),
  error: (m: string, e?: unknown) => emit("error", m, e),
};
