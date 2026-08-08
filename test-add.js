/**
 * 手动添加日程自动化测试
 * 测试逻辑：每次添加后，下一次 openManualAdd 应该从最后事件的结束时间开始
 * 测试 10 个时间点，每个时间点连续添加 10 次
 */
const fs = require('fs');
const path = require('path');

// Load the HTML to analyze the logic
const html = fs.readFileSync(
  'C:/Users/lenovo/WorkBuddy/2026-08-06-09-53-11/schedule-app/index.html', 'utf8'
);

// === Extract JS logic for testing ===
// Simulate localStorage
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; }
};

const dayjs = require('./node_modules/dayjs/dayjs.min.js');

// Helper functions (extracted from the HTML)
const EVENTS_KEY = 'schedule_events';
function loadAllEvents() {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); } catch { return []; }
}
function saveAllEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}
function generateId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}
function timeToMin(t) {
  if (!t) return 0;
  const parts = String(t).split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
function minToTime(m) {
  m = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

// The exact findLatestEnd from the code
const findLatestEnd = (date) => {
  const fresh = loadAllEvents().filter(e => e.date === date).map(e => ({
    s: timeToMin(e.startTime),
    e: e.endTime ? timeToMin(e.endTime) : timeToMin(e.startTime) + 60,
  })).sort((a, b) => b.e - a.e);

  if (fresh.length === 0) {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    return minToTime(date === todayStr() ? Math.max(360, m) : 360);
  }

  return minToTime(fresh[0].e);
};

// === TEST HARNESS ===
function addEvent(date, startTime, durationMin = 60) {
  const sm = timeToMin(startTime);
  const evt = {
    id: generateId(),
    date,
    startTime,
    endTime: minToTime(sm + durationMin),
    description: `测试事件 ${startTime}`,
    categories: ['测试']
  };
  const all = loadAllEvents();
  all.push(evt);
  saveAllEvents(all);
  return evt;
}

function clearAll() {
  localStorage.setItem(EVENTS_KEY, JSON.stringify([]));
}

// Simulate unified handleCell: start = max(clickedHour, findLatestEnd)
function simulateUnifiedClick(date, clickedHour) {
  const cellTime = `${String(clickedHour).padStart(2,'0')}:00`;
  const latest = findLatestEnd(date);
  const latestMin = timeToMin(latest);
  const clickMin = timeToMin(cellTime);
  const start = clickMin > latestMin ? cellTime : latest;
  return start;
}
  localStorage.setItem(EVENTS_KEY, '[]');
}

// === RUN TESTS ===
const testDates = [
  todayStr(),
  dayjs().add(1, 'day').format('YYYY-MM-DD'),
  dayjs().add(2, 'day').format('YYYY-MM-DD'),
  dayjs().add(3, 'day').format('YYYY-MM-DD'),
  dayjs().add(4, 'day').format('YYYY-MM-DD'),
  dayjs().add(5, 'day').format('YYYY-MM-DD'),
  dayjs().add(6, 'day').format('YYYY-MM-DD'),
  dayjs().add(7, 'day').format('YYYY-MM-DD'),
  dayjs().add(8, 'day').format('YYYY-MM-DD'),
  dayjs().add(9, 'day').format('YYYY-MM-DD'),
];

const DURATIONS = [30, 60, 90, 120, 45, 30, 60, 30, 60, 45]; // 10种不同时长

let totalTests = 0;
let failures = [];
const results = [];

for (const date of testDates) {
  clearAll(); // fresh for each date
  const dateResults = [];
  
  for (let i = 0; i < 10; i++) {
    totalTests++;
    
    // Step 1: Simulate opening manual add - what startTime would findLatestEnd return?
    const expectedStart = findLatestEnd(date);
    
    // Step 2: Add an event with this startTime + some duration
    const duration = DURATIONS[i];
    addEvent(date, expectedStart, duration);
    
    // Step 3: After adding, the next findLatestEnd should be after this event ends
    const nextExpected = findLatestEnd(date);
    const expectedNextStart = timeToMin(expectedStart) + duration;
    
    const pass = timeToMin(nextExpected) === expectedNextStart;
    
    dateResults.push({
      round: i + 1,
      start: expectedStart,
      duration,
      expectedEnd: minToTime(expectedNextStart),
      actualNextStart: nextExpected,
      pass
    });
    
    if (!pass) {
      failures.push({ date, round: i + 1, expectedStart, duration, expectedEnd: minToTime(expectedNextStart), actualNextStart: nextExpected });
    }
  }
  
  results.push({ date, events: dateResults });
}

// === REPORT ===
console.log(`\n========== 测试报告 ==========`);
console.log(`总测试数: ${totalTests}`);
console.log(`通过: ${totalTests - failures.length}`);
console.log(`失败: ${failures.length}`);
console.log(`成功率: ${((totalTests - failures.length) / totalTests * 100).toFixed(1)}%\n`);

if (failures.length > 0) {
  console.log(`========== 失败详情 ==========`);
  failures.forEach(f => {
    console.log(`日期: ${f.date}  第${f.round}次`);
    console.log(`  预期起点: ${f.expectedEnd}  实际起点: ${f.actualNextStart}`);
    console.log(`  上次: start=${f.expectedStart} duration=${f.duration}min`);
  });
}

// Also show sample results for the first date
console.log(`\n========== 第一个日期的详细结果 ==========`);
console.log(`日期: ${results[0].date}`);
results[0].events.forEach(r => {
  console.log(`  第${r.round}次: start=${r.start} duration=${r.duration}min → next_start=${r.actualNextStart} ${r.pass ? '✓' : '✗'}`);
});
