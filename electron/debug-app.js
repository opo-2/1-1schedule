const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 800, height: 600, show: true });
  win.webContents.openDevTools();

  win.webContents.on('console-message', (e, level, msg) => {
    const levels = ['verbose','info','warning','error'];
    console.log(`[${levels[level]}]`, msg);
  });

  win.webContents.on('did-fail-load', (e, ec, ed, url) => {
    console.log('FAILED TO LOAD:', url, ec, ed);
  });

  await win.loadURL('http://localhost:8888/index.html');
  win.webContents.executeJavaScript('console.log("Page loaded, React version:", React.version)').catch(e => console.log('JS error:', e.message));

  setTimeout(() => app.quit(), 5000);
});

app.on('window-all-closed', () => app.quit());