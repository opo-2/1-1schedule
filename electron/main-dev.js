const { app, BrowserWindow } = require('electron');
const path = require('path');

let win = null;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    title: '1+1schedule [开发版]',
    backgroundColor: '#f8f8f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
});

app.on('window-all-closed', () => app.quit());
