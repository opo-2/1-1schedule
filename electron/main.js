const { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && !fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'));

let mainWindow = null;
let popupWindow = null;
let tray = null;
let popupTimer = null;
let dataDir = '';
let quitting = false;

// ====== 数据目录 ======
function initDataDir() {
  // 数据存 OneDrive，多机自动同步
  const onedrive = path.join(process.env.USERPROFILE || '', 'OneDrive');
  if (fs.existsSync(onedrive)) {
    dataDir = path.join(onedrive, 'schedule-data');
  } else {
    // 回退：OneDrive 不可用时存本地
    dataDir = path.join(app.getPath('userData'), 'schedule-data');
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getDataFile() {
  return path.join(dataDir, 'events.json');
}

// ====== 数据读写 ======
function readEvents() {
  const file = getDataFile();
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return []; }
}

function writeEvents(events) {
  fs.writeFileSync(getDataFile(), JSON.stringify(events, null, 2), 'utf-8');
}

const iconPath = path.join(__dirname, '..', 'build', 'icon.png');

// ====== 图标 ======
function getAppIcon() {
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    return nativeImage.createEmpty();
  }
}

function getTrayIcon() {
  const icon = getAppIcon();
  return icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 });
}

// ====== 主窗口 ======
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '1+1schedule',
    backgroundColor: '#f8f8f6',
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.openDevTools({ mode: 'detach' });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const argv = process.argv.find(a => a.startsWith('http://'));
    mainWindow.loadURL(argv || path.join('file://', __dirname, '../dist/index.html'));
  }

  // 关闭窗口 → 最小化到托盘（不退出）
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ====== 快捷弹窗 ======
let popupFirstTrigger = null;

function showPopup() {
  const hour = new Date().getHours();

  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('popup-extend', hour);
    return;
  }

  popupFirstTrigger = hour;

  popupWindow = new BrowserWindow({
    width: 380,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    frame: true,
    title: '',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  popupWindow.setPosition(width - 400, height - 480);

  if (isDev) {
    popupWindow.loadURL(`http://localhost:5173/#/popup?hour=${hour}`);
  } else {
    popupWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: `/popup?hour=${hour}`,
    });
  }

  popupWindow.showInactive();
  popupWindow.setAlwaysOnTop(true, 'floating');

  popupWindow.on('closed', () => {
    popupWindow = null;
    popupFirstTrigger = null;
  });
}

// ====== 定时器：按设置周期弹窗 ======
function startPopupTimer() {
  if (popupTimer) clearInterval(popupTimer);
  let lastTriggered = -1;

  popupTimer = setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();

    // 8:00~20:00 之间，每2小时整点触发
    if (hour >= 8 && hour <= 20 && hour % 2 === 0 && min === 0 && hour !== lastTriggered) {
      lastTriggered = hour;
      showPopup();
    }
    if (min > 2) {
      lastTriggered = -1;
    }
  }, 30000);
}

// ====== 系统托盘（无外部图标文件也可运行） ======
function createTray() {
  try {
    tray = new Tray(getTrayIcon());

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '打开主窗口',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      { label: '立即记录', click: () => showPopup() },
      { type: 'separator' },
      {
        label: '退出日程管理',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('1+1schedule');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createMainWindow();
      }
    });
  } catch (err) {
    console.error('托盘创建失败（不影响弹窗功能）:', err.message);
  }
}

// ====== IPC 处理 ======
function setupIPC() {
  ipcMain.handle('get-events', (_event, startDate, endDate) => {
    const events = readEvents();
    return events.filter((e) => e.date >= startDate && e.date <= endDate);
  });

  ipcMain.handle('save-event', (_event, event) => {
    const events = readEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) events[idx] = event;
    else events.push(event);
    writeEvents(events);
    return { success: true };
  });

  ipcMain.handle('delete-event', (_event, id) => {
    writeEvents(readEvents().filter((e) => e.id !== id));
    return { success: true };
  });

  ipcMain.handle('close-popup', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });

  ipcMain.handle('set-popup-height', (_event, h) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.setSize(380, Math.max(400, Math.min(640, h)));
    }
  });

  ipcMain.handle('dialog:open-file', async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      title: '选择文件',
      filters: filters || [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { name: path.basename(filePath), content };
  });

  // 开机自启
  ipcMain.handle('get-autostart', () => {
    return fs.existsSync(path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', '日程管理.lnk'));
  });
  ipcMain.handle('set-autostart', (_event, enable) => {
    const lnk = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', '日程管理.lnk');
    if (enable) {
      const batPath = path.join(__dirname, '..', '静默启动.bat');
      const ps = `$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut('${lnk}');$s.TargetPath='${batPath}';$s.WorkingDirectory='${path.dirname(batPath)}';$s.WindowStyle=7;$s.Save()`;
      try { require('child_process').execSync(`powershell -Command "${ps}"`, { windowsHide: true }); return true; }
      catch { return false; }
    } else {
      try { fs.unlinkSync(lnk); return true; }
      catch { return false; }
    }
  });
}

// ====== 生命周期 ======
app.whenReady().then(() => {
  initDataDir();
  setupIPC();
  createMainWindow();
  createTray();
  startPopupTimer();

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else {
      createMainWindow();
    }
  });
});

// 防止所有窗口关闭时退出（关键：保持后台运行）
app.on('window-all-closed', () => {
  // 在 Windows/Linux 上不退出，让托盘和定时器继续跑
});

app.on('before-quit', () => {
  quitting = true;
  if (popupTimer) clearInterval(popupTimer);
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
});

// 单实例锁
app.setName('1+1schedule');
  const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
