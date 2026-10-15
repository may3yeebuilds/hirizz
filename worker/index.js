export default {async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/api/job-description'){
    if(request.method!=='POST')return Response.json({error:'Use POST to import a job link.'},{status:405,headers:{Allow:'POST'}});
    if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Expected JSON.'},{status:415});
    const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return Response.json({error:'Request origin not allowed.'},{status:403});
    try{const raw=await request.text();if(raw.length>4096)return Response.json({error:'Request too large.'},{status:413});let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid request.'},{status:400});}if(typeof body.url!=='string'||body.url.length>3000)return Response.json({error:'Enter a valid job link.'},{status:400});return Response.json(await importJob(body.url),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof JobImportError?e.message:'Could not import this job link.'},{status:e.status||502});}
  }
  const asset=ASSETS[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});
  return new Response(asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});
}};
