// 常用项 + 对应分类（同类事件共享一种颜色）
export interface PresetItem {
  text: string;
  category: string; // 分类名，决定颜色
}

// 按时段分类的常用项
export const PRESETS_BY_TIME: Record<number, PresetItem[]> = {
  8: [
    { text: '早饭', category: '饮食' },
    { text: '通勤', category: '通勤' },
    { text: '晨会', category: '会议' },
    { text: '邮件处理', category: '办公' },
    { text: '整理计划', category: '规划' },
    { text: '晨读', category: '学习' },
  ],
  10: [
    { text: '实验', category: '实验' },
    { text: '数据分析', category: '数据分析' },
    { text: '文献阅读', category: '文献' },
    { text: '会议', category: '会议' },
    { text: '写报告', category: '写作' },
    { text: '代码编写', category: '开发' },
    { text: '样品处理', category: '实验' },
  ],
  12: [
    { text: '午饭', category: '饮食' },
    { text: '午休', category: '休息' },
    { text: '散步', category: '运动' },
    { text: '阅读', category: '学习' },
    { text: '咖啡', category: '饮食' },
  ],
  14: [
    { text: '实验', category: '实验' },
    { text: '会议', category: '会议' },
    { text: '写报告', category: '写作' },
    { text: '数据分析', category: '数据分析' },
    { text: '文献阅读', category: '文献' },
    { text: '仪器操作', category: '实验' },
    { text: '试剂管理', category: '实验' },
  ],
  16: [
    { text: '实验', category: '实验' },
    { text: '数据分析', category: '数据分析' },
    { text: '文献阅读', category: '文献' },
    { text: '整理数据', category: '数据分析' },
    { text: '写报告', category: '写作' },
    { text: '组会', category: '会议' },
  ],
  18: [
    { text: '晚饭', category: '饮食' },
    { text: '通勤', category: '通勤' },
    { text: '运动', category: '运动' },
    { text: '学习', category: '学习' },
    { text: '整理', category: '整理' },
    { text: '记录', category: '写作' },
  ],
  20: [
    { text: '学习', category: '学习' },
    { text: '阅读', category: '学习' },
    { text: '运动', category: '运动' },
    { text: '整理', category: '整理' },
    { text: '娱乐', category: '休息' },
  ],
};

// 获取当前时段对应的常用项
export function getPresets(hour: number): PresetItem[] {
  const keys = Object.keys(PRESETS_BY_TIME).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (k <= hour) best = k;
    else break;
  }
  return PRESETS_BY_TIME[best] || [];
}

// 分钟转 HH:mm
export function minToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// HH:mm 转分钟
export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// 生成当前周的起止日期
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  return { start: fmt(monday), end: fmt(sunday) };
}

// 获取一周中每天的日期
export function getWeekDays(mondayStr: string): { label: string; date: string; md: string }[] {
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const [y, m, d] = mondayStr.split('-').map(Number);
  const monday = new Date(y, m - 1, d);

  return dayNames.map((label, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const md = `${String(dt.getMonth() + 1)}/${String(dt.getDate())}`;
    return { label, date, md };
  });
}

// 所有分类列表
export const ALL_CATEGORIES = [
  '实验', '数据分析', '文献', '会议', '写作', '学习',
  '饮食', '休息', '运动', '通勤', '办公', '规划',
  '开发', '整理',
];
