import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+path.sep))throw Error();const file=await readFile(p===root?path.join(root,'index.html'):p);res.setHeader('Content-Type',p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':'text/html');res.end(file)}catch{res.writeHead(404);res.end('Not found')}}).listen(3000,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:3000'));
