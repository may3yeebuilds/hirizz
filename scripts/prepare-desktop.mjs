import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('desktop/assets',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){if(['server','.openai','sw.js'].includes(entry.name))continue;await cp('dist/'+entry.name,'desktop/assets/'+entry.name,{recursive:true});}
await cp('worker/jd.js','desktop/jd.mjs');
const index=await readFile('desktop/assets/index.html','utf8');
await writeFile('desktop/assets/index.html',index.replace('Browser-local storage','Stored on this device').replace('Saved on this browser','Saved on this device'));
console.log('Prepared self-contained Windows app assets.');
