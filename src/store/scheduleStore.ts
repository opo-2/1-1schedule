import { ScheduleEvent } from '../types';

const STORAGE_KEY = 'schedule-events';

// 获取 Electron API（开发模式下可能不存在）
function getAPI() {
  return window.electronAPI;
}

// 本地 localStorage 降级方案
function localGetEvents(): ScheduleEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function localSaveEvents(events: ScheduleEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export async function fetchEvents(startDate: string, endDate: string): Promise<ScheduleEvent[]> {
  const api = getAPI();
  if (api) {
    return api.getEvents(startDate, endDate);
  }
  // 降级：从 localStorage 过滤
  const all = localGetEvents();
  return all.filter((e) => e.date >= startDate && e.date <= endDate);
}

export async function saveEvent(event: ScheduleEvent): Promise<void> {
  const api = getAPI();
  if (api) {
    await api.saveEvent(event);
    return;
  }
  const all = localGetEvents();
  const idx = all.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    all[idx] = event;
  } else {
    all.push(event);
  }
  localSaveEvents(all);
}

export async function deleteEvent(id: string): Promise<void> {
  const api = getAPI();
  if (api) {
    await api.deleteEvent(id);
    return;
  }
  const all = localGetEvents().filter((e) => e.id !== id);
  localSaveEvents(all);
}

export function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
