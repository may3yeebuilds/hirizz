import {app,BrowserWindow,protocol,session,shell,ipcMain,dialog,Menu} from 'electron';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import {importJob,JobImportError} from './jd.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const smoke=process.env.HIRIZZ_SMOKE_TEST==='1';
if(smoke){const profile=process.env.HIRIZZ_SMOKE_PROFILE;if(!profile||!path.isAbsolute(profile))throw Error('Smoke test requires a separate absolute profile path.');mkdirSync(profile,{recursive:true});app.setPath('userData',profile);}
protocol.registerSchemesAsPrivileged([{scheme:'hirizz',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock())app.quit();
let mainWindow;
const esc=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function external(url){try{const u=new URL(url);if(['https:','http:'].includes(u.protocol))shell.openExternal(u.href);}catch{}}
function createWindow(){
  mainWindow=new BrowserWindow({show:!smoke,width:1380,height:900,minWidth:760,minHeight:600,title:'Hirizz',backgroundColor:'#f8f9f5',icon:path.join(here,'assets/icons/icon-512.png'),webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  mainWindow.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('hirizz://app/')){e.preventDefault();external(url);}});
  mainWindow.loadURL('hirizz://app/');
  if(smoke)mainWindow.webContents.once('did-finish-load',()=>runSmoke().catch(error=>{console.error(error);app.exit(1);}));
}
async function runSmoke(){
  const result=await mainWindow.webContents.executeJavaScript(`(async()=>{
    if(!document.querySelector('#add-job'))throw Error('App UI failed to initialize');
    if(typeof window.require!=='undefined')throw Error('Renderer Node isolation failed');
    if(typeof window.hirizzDesktop?.savePdf!=='function')throw Error('PDF bridge missing');
    const image=await fetch('/icons/icon-192.png');const png=new Uint8Array(await image.arrayBuffer());if(png[0]!==137||png[1]!==80)throw Error('Icon serving failed');
    const response=await fetch('/api/job-description',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://127.0.0.1/job'})});if(response.ok)throw Error('Invalid job URL was not rejected');
    document.querySelector('nav [data-view="resume"]').click();document.querySelector('#resume-name').value='Desktop smoke test';document.querySelector('#resume-text').value='Candidate\\nCareer History\\nBuilt AWS and Python tools in 2024 for 20 customers';document.querySelector('#save-resume').click();
    const state=JSON.parse(localStorage.getItem('hirizz.workspace.v1'));state.jobs=[{id:'desktop-smoke-job',company:'Sample Co',role:'Analyst',jd:'Amazon Web Services Python SQL',url:'',location:'Remote',notes:'',followup:'',created:new Date().toISOString(),status:'Saved',history:[],draft:''}];localStorage.setItem('hirizz.workspace.v1',JSON.stringify(state));return {ui:true,isolated:true,bridge:true,icons:true,urlValidation:true};
  })()`);
  await new Promise(resolve=>{mainWindow.webContents.once('did-finish-load',resolve);mainWindow.reload();});
  const draft=await mainWindow.webContents.executeJavaScript(`(()=>{document.querySelector('.role-link').click();document.querySelector('#tab-resume').click();document.querySelector('#tailor-resume').click();const text=document.querySelector('#draft').value;if(!text.includes('Amazon Web Services'))throw Error('Tailoring failed');if(!document.querySelector('#draft-analysis').textContent.includes('Estimated ATS score'))throw Error('Score comparison missing');return text;})()`);
  const pdf=await mainWindow.webContents.printToPDF({pageSize:'A4'});if(pdf.subarray(0,4).toString()!=='%PDF')throw Error('PDF export failed');
  const report={...result,persistence:true,tailoring:true,scoring:true,pdf:true,draftLength:draft.length};
  await writeFile(path.join(app.getPath('userData'),'smoke-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0);
}
app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
app.whenReady().then(async()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'Save Hirizz download',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))}));
  protocol.handle('hirizz',async request=>{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
    if(url.pathname==='/api/job-description'){
      if(request.method!=='POST'||!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Expected a JSON POST request.'},{status:405});
      try{const raw=await request.text();if(raw.length>4096)throw new JobImportError('Request too large.',413);const body=JSON.parse(raw);if(typeof body.url!=='string'||body.url.length>3000)throw new JobImportError('Enter a valid job link.');return Response.json(await importJob(body.url));}catch(e){return Response.json({error:e instanceof JobImportError?e.message:'Could not import the posting. Check your internet connection.'},{status:e.status||502});}
    }
    if(request.method!=='GET')return new Response('Method not allowed',{status:405});
    try{const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const root=path.join(here,'assets');const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep))return new Response('Not found',{status:404});const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(target)]||'application/octet-stream';return new Response(await readFile(target),{headers:{'content-type':type,'x-content-type-options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
  });
  ipcMain.handle('hirizz:save-pdf',async(event,text)=>{
    if(event.sender!==mainWindow?.webContents||!event.senderFrame?.url.startsWith('hirizz://app/')||typeof text!=='string'||!text.trim()||text.length>2_000_000)throw Error('Invalid resume export.');
    const destination=await dialog.showSaveDialog(mainWindow,{title:'Save tailored resume as PDF',defaultPath:'Hirizz-tailored-resume.pdf',filters:[{name:'PDF document',extensions:['pdf']}]});if(destination.canceled||!destination.filePath)return false;
    const printWindow=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,javascript:false}});
    try{await printWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta charset="utf-8"><title>Resume</title><style>body{font:11pt/1.5 Arial;white-space:pre-wrap;overflow-wrap:anywhere} @page{margin:18mm}</style><body>'+esc(text)+'</body>'));const pdf=await printWindow.webContents.printToPDF({pageSize:'A4',printBackground:false,preferCSSPageSize:true});await writeFile(destination.filePath,pdf);return true;}finally{printWindow.destroy();}
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Hirizz',submenu:[{label:'Reload',role:'reload'},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
  createWindow();
});
app.on('window-all-closed',()=>app.quit());
