import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getEvents: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('get-events', startDate, endDate),
  saveEvent: (event: any) => ipcRenderer.invoke('save-event', event),
  deleteEvent: (id: string) => ipcRenderer.invoke('delete-event', id),
  closePopup: () => ipcRenderer.invoke('close-popup'),
  setPopupHeight: (h: number) => ipcRenderer.invoke('set-popup-height', h),
});
