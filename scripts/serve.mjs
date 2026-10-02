import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');const port=Number(process.env.PORT||4321);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{let file;try{const url=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html')}catch{res.writeHead(400);return res.end('Bad request')}
if(!fs.existsSync(file)){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(root,'404.html')))}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain; charset=utf-8'});fs.createReadStream(file).pipe(res)}).listen(port,'127.0.0.1',()=>console.log(`Preview http://127.0.0.1:${port}`));
