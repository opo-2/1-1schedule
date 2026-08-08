const electron = require('electron');
const path = require('path');
const fs = require('fs');

const { app, BrowserWindow } = electron;

fs.writeFileSync('test-electron.log', JSON.stringify({
  hasApp: !!app,
  hasBW: !!BrowserWindow,
  hasWhenReady: typeof (app && app.whenReady),
  keys: Object.keys(electron).slice(0, 20),
}));

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    title: '1+1schedule [开发版]',
    backgroundColor: '#f8f8f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
