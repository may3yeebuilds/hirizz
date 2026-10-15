import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const {default:worker}=await import(pathToFileURL(process.cwd()+'/dist/server/index.js'));
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const request=new Request(new URL(req.url,'http://127.0.0.1:3000'),{method:req.method,headers:req.headers,...(body.length?{body}: {})});const response=await worker.fetch(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Server error');}}).listen(3000,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:3000'));
