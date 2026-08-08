export interface ScheduleEvent {
  id: string;
  date: string;           // "2026-08-06"
  startTime: string;      // "08:00"
  endTime: string | null; // "09:30", null = 进行中
  description: string;
  category: string;       // 事件分类，同类同色
  color: string;          // 自定义颜色 hex
  status: 'completed' | 'in_progress';
  createdAt: string;
}

// 莫兰迪色盘 — 预定义9色
export const MORANDI_COLORS: string[] = [
  '#B5C4B1', // 鼠尾草绿
  '#C4A8A0', // 灰粉
  '#A3B5C7', // 灰蓝
  '#B8A9C9', // 灰紫
  '#C9B99A', // 灰黄
  '#C4A48E', // 灰陶
  '#A8C4BD', // 青瓷
  '#B5B0C0', // 灰薰衣草
  '#B9BFAA', // 橄榄灰
];

// 按分类名取颜色（hash 到色盘）
export function getColorForCategory(category: string): string {
  if (!category) return MORANDI_COLORS[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash |= 0;
  }
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
}

export interface ElectronAPI {
  getEvents: (startDate: string, endDate: string) => Promise<ScheduleEvent[]>;
  saveEvent: (event: ScheduleEvent) => Promise<{ success: boolean }>;
  deleteEvent: (id: string) => Promise<{ success: boolean }>;
  closePopup: () => Promise<void>;
  setPopupHeight: (h: number) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
