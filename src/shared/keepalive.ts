export type KeepaliveMode = 'off' | 'always' | 'windows' | 'recycle';
export interface TimeWindow { start: string; end: string }
export interface KeepalivePolicy {
  machineId: string; accountId: string; machineName: string; mode: KeepaliveMode;
  timezone: string; windows: TimeWindow[]; lastCheckedAt: number | null;
  lastState: string; lastResult: string; lastError: string;
}
export interface KeepaliveOverview {
  intervalMinutes: number; maxMachines: number;
  policies: KeepalivePolicy[]; lastRunAt: number | null;
}
export const KEEPALIVE_INTERVAL_MINUTES = 1;
export const KEEPALIVE_MAX_MACHINES = 5;
// 回收保活：机器连续运行到该分钟数时主动暂停，赶在免费版 480 分钟
// max-run 强制暂停之前重置计时，避免冷却惩罚（第 2 次起 60 分钟以上）。
// 主动 suspend 不计入冷却，恢复由下一次定时检查完成。
export const RECYCLE_AFTER_MINUTES = 465;

export function validateSchedule(value: unknown): { mode: KeepaliveMode; timezone: string; windows: TimeWindow[] } {
  const body = value as Record<string, unknown> | null;
  if (!body || typeof body.mode !== 'string' || !['off', 'always', 'windows', 'recycle'].includes(body.mode)) throw new Error('请选择有效的保活模式。');
  const mode = body.mode as KeepaliveMode;
  const timezone = typeof body.timezone === 'string' ? body.timezone : 'Asia/Shanghai';
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
  catch { throw new Error('请选择有效的 IANA 时区，例如 Asia/Shanghai。'); }
  if (mode !== 'windows') return { mode, timezone, windows: [] };
  if (!Array.isArray(body.windows) || body.windows.length < 1 || body.windows.length > 5)
    throw new Error('请设置 1 到 5 个时间范围。');
  const occupied = new Set<number>();
  const windows = body.windows.map((entry: unknown) => {
    const window = entry as TimeWindow | null;
    if (!window || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(window.start) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(window.end))
      throw new Error('时间格式需要为 HH:mm。');
    const start = minutes(window.start), end = minutes(window.end);
    if (start === end) throw new Error('开始和结束时间不能相同；全天请使用“全天保活”。');
    for (let minute = start; minute !== end; minute = (minute + 1) % 1440) {
      if (occupied.has(minute)) throw new Error('时间范围不能重叠。');
      occupied.add(minute);
    }
    return { start: window.start, end: window.end };
  });
  return { mode, timezone, windows };
}
function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
export function inKeepaliveWindow(policy: { mode: KeepaliveMode; timezone: string; windows: TimeWindow[] }, timestamp: number): boolean {
  if (policy.mode !== 'windows') return policy.mode === 'always' || policy.mode === 'recycle';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: policy.timezone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(timestamp);
  const current = Number(parts.find(part => part.type === 'hour')?.value) * 60 + Number(parts.find(part => part.type === 'minute')?.value);
  return policy.windows.some(window => {
    const start = minutes(window.start), end = minutes(window.end);
    return start < end ? current >= start && current < end : current >= start || current < end;
  });
}
