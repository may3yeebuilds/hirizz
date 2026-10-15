const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('hirizzDesktop',Object.freeze({platform:'windows',savePdf:text=>ipcRenderer.invoke('hirizz:save-pdf',text)}));
