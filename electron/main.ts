import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let popupTimer: NodeJS.Timeout | null = null;
let dataDir = '';

// ====== 数据目录 ======
function initDataDir() {
  const userDataPath = app.getPath('userData');
  dataDir = path.join(userDataPath, 'schedule-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getDataFile(): string {
  return path.join(dataDir, 'events.json');
}

// ====== 数据读写 ======
function readEvents(): any[] {
  const file = getDataFile();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeEvents(events: any[]) {
  const file = getDataFile();
  fs.writeFileSync(file, JSON.stringify(events, null, 2), 'utf-8');
}

// ====== 主窗口 ======
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '日程管理',
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ====== 快捷弹窗 - 小巧静默 ======
function showPopup() {
  // 如果已有弹窗先关掉
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }

  popupWindow = new BrowserWindow({
    width: 380,
    height: 480,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    frame: true,
    title: '记录时段',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 定位到屏幕右下角
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  popupWindow.setPosition(width - 400, height - 500);

  if (isDev) {
    const now = new Date();
    const hour = now.getHours();
    popupWindow.loadURL(`http://localhost:5173/#/popup?hour=${hour}`);
  } else {
    const now = new Date();
    const hour = now.getHours();
    popupWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: `/popup?hour=${hour}`,
    });
  }

  // 静默显示：不抢焦点、不闪烁
  popupWindow.showInactive();
  popupWindow.setAlwaysOnTop(true, 'floating');

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
}

// ====== 定时器：每2小时弹窗 ======
function startPopupTimer() {
  // 清理旧定时器
  if (popupTimer) clearInterval(popupTimer);

  // 每15分钟检查一次是否到了弹出时间
  popupTimer = setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();

    // 偶数整点（8,10,12,14,16,18,20）的前后1分钟内触发
    if (
      hour >= 8 &&
      hour <= 20 &&
      hour % 2 === 0 &&
      min === 0
    ) {
      showPopup();

      // 弹窗打开后等待一分钟再继续检查，避免重复弹出
      setTimeout(() => {}, 60000);
    }
  }, 30000); // 每30秒检查一次
}

// ====== 系统托盘 ======
function createTray() {
  tray = new Tray(
    path.join(
      __dirname,
      isDev ? '../public/tray-icon.png' : '../dist/tray-icon.png'
    )
  );

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主窗口', click: () => { if (mainWindow) mainWindow.show(); else createMainWindow(); } },
    { label: '立即记录', click: () => showPopup() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('日程管理');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
    else createMainWindow();
  });
}

// ====== IPC 处理 ======
function setupIPC() {
  ipcMain.handle('get-events', (_event, startDate: string, endDate: string) => {
    const events = readEvents();
    return events.filter(
      (e: any) => e.date >= startDate && e.date <= endDate
    );
  });

  ipcMain.handle('save-event', (_event, event: any) => {
    const events = readEvents();
    const idx = events.findIndex((e: any) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      events.push(event);
    }
    writeEvents(events);
    return { success: true };
  });

  ipcMain.handle('delete-event', (_event, id: string) => {
    let events = readEvents();
    events = events.filter((e: any) => e.id !== id);
    writeEvents(events);
    return { success: true };
  });

  ipcMain.handle('close-popup', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });

  // 设置弹窗高度（内容变化时调整）
  ipcMain.handle('set-popup-height', (_event, h: number) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      const minH = 420;
      const maxH = 640;
      popupWindow.setSize(380, Math.max(minH, Math.min(maxH, h)));
    }
  });
}

// ====== 应用生命周期 ======
app.whenReady().then(() => {
  initDataDir();
  setupIPC();
  createMainWindow();
  createTray();
  startPopupTimer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 不退出，保持在托盘
  if (process.platform !== 'darwin') {
    // macOS 上不退出
  }
});

app.on('before-quit', () => {
  if (popupTimer) clearInterval(popupTimer);
});

// 阻止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
