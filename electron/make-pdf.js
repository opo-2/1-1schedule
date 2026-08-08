// 生成 PDF 说明书
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 800, height: 1000, show: false });
  const htmlPath = path.join(__dirname, '../使用说明书.html');
  await win.loadFile(htmlPath);
  // 等待渲染
  await new Promise(r => setTimeout(r, 2000));
  const pdfPath = path.join(__dirname, '../使用说明书.pdf');
  const data = await win.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
  });
  fs.writeFileSync(pdfPath, data);
  console.log('PDF saved to', pdfPath);
  app.quit();
});