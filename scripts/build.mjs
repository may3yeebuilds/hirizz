import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
const assets={};
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(['server','.openai'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())await collect(file);else{const ext=path.extname(file);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'}[ext]||'text/plain; charset=utf-8';const binary=['.png','.ico'].includes(ext);assets['/'+path.relative('dist',file).replaceAll('\\','/')]={body:await readFile(file,binary?'base64':'utf8'),type,...(binary?{encoding:'base64'}:{})};}}}
await collect('dist');await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+await readFile('worker/jd.js','utf8')+'\n'+await readFile('worker/index.js','utf8'));
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));
console.log('Built Hirizz server and embedded browser assets.');
