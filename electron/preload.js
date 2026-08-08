const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getEvents: (startDate, endDate) =>
    ipcRenderer.invoke('get-events', startDate, endDate),
  saveEvent: (event) => ipcRenderer.invoke('save-event', event),
  deleteEvent: (id) => ipcRenderer.invoke('delete-event', id),
  closePopup: () => ipcRenderer.invoke('close-popup'),
  setPopupHeight: (h) => ipcRenderer.invoke('set-popup-height', h),
  onPopupExtend: (callback) => ipcRenderer.on('popup-extend', (_event, hour) => callback(hour)),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  openFile: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
});
