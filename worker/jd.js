export class JobImportError extends Error { constructor(message,status=422){super(message);this.status=status;} }
export function validateJobUrl(value){
  let url;try{url=new URL(value);}catch{throw new JobImportError('Enter a valid job posting URL.');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||!host.includes('.')||!/^[a-z0-9.-]+$/.test(host)||/^\d+(\.\d+){3}$/.test(host)||/(^|\.)(localhost|local|internal|test|invalid|example|onion|arpa)$/.test(host)||host.endsWith('.localhost'))throw new JobImportError('Use an HTTPS link to a public job posting.');
  url.hash='';return url;
}
export function isPublicIP(ip){
  if(ip.includes(':'))return /^[23][0-9a-f]{3}:/i.test(ip)&&!/^2001:(?:0*:|db8:|10:|20:)/i.test(ip)&&!/^2002:/i.test(ip);
  const a=ip.split('.').map(Number);if(a.length!==4||a.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  return !([0,10,127].includes(a[0])||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&(a[1]===168||a[1]===0||a[1]===2))||(a[0]===100&&a[1]>=64&&a[1]<=127)||(a[0]===198&&(a[1]===18||a[1]===19||a[1]===51))||(a[0]===203&&a[1]===0&&a[2]===113));
}
async function checkPublicHost(host,fetcher,signal){
  const answers=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'},signal});if(!r.ok)throw new JobImportError('Could not verify the job website. Please try again.',502);const d=await r.json();if(d.Status!==0)throw new JobImportError('The job website could not be found. Check the link.');return (d.Answer||[]).filter(a=>a.type===1||a.type===28).map(a=>a.data);}));
  const ips=answers.flat();if(!ips.length||ips.some(ip=>!isPublicIP(ip)))throw new JobImportError('This link does not resolve to a public job website.');
}
async function limitedText(response,limit=2_000_000){
  if(Number(response.headers.get('content-length'))>limit)throw new JobImportError('This job page is too large to import.');
  const reader=response.body?.getReader();if(!reader)return '';let length=0;const decoder=new TextDecoder();let text='';
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new JobImportError('This job page is too large to import.');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();
}
export async function importJob(value,fetcher=fetch){
  let url=validateJobUrl(value);const sourceUrl=url.href;let provider='';
  const greenhouse=url.pathname.match(/^\/([^/]+)\/jobs\/(\d+)\/?$/);
  const lever=url.pathname.match(/^\/([^/]+)\/([a-z0-9-]+)\/?$/i);
  if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(url.hostname)&&greenhouse){provider='greenhouse';url=new URL(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(greenhouse[1])}/jobs/${greenhouse[2]}`);}
  else if(['jobs.lever.co','jobs.eu.lever.co'].includes(url.hostname)&&lever){provider='lever';url=new URL(`https://${url.hostname==='jobs.eu.lever.co'?'api.eu.lever.co':'api.lever.co'}/v0/postings/${encodeURIComponent(lever[1])}/${lever[2]}?mode=json`);}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  try{
    for(let i=0;i<5;i++){
      await checkPublicHost(url.hostname,fetcher,controller.signal);
      const r=await fetcher(url.href,{redirect:'manual',headers:{accept:'text/html,application/xhtml+xml,application/json','user-agent':'Hirizz/0.2 (job description import)'},signal:controller.signal});
      if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');if(!location)break;url=validateJobUrl(new URL(location,url).href);continue;}
      if(!r.ok)throw new JobImportError(r.status===403||r.status===401||r.status===429?'This job board is blocking automated access. Try the employer’s direct careers link instead.':'The job page could not be retrieved. It may have expired or moved.',r.status===404?404:422);
      if(!/text\/html|application\/(xhtml\+xml|json)/i.test(r.headers.get('content-type')||''))throw new JobImportError('This link is not a readable job posting page.');
      const html=await limitedText(r);
      if(provider){let data;try{data=JSON.parse(html);}catch{throw new JobImportError('This job board returned an unreadable posting.');}
        const posting=provider==='greenhouse'?{'@type':'JobPosting',title:data.title,hiringOrganization:{name:data.company_name||''},description:decode(data.content||''),jobLocation:{address:{addressLocality:data.location?.name||''}},datePosted:data.first_published,validThrough:data.application_deadline}: {'@type':'JobPosting',title:data.text,description:[data.description,...(data.lists||[]).map(l=>`<h2>${l.text}</h2>${l.content}`),data.additional].filter(Boolean).join('\n'),jobLocation:{address:{addressLocality:data.categories?.location||''}},employmentType:data.categories?.commitment};
        const result=parseJobPage(JSON.stringify(posting),sourceUrl);result.method='Employer job board data';return result;
      }
      return parseJobPage(html,url.href);
    }
    throw new JobImportError('The job link redirects too many times. Try the final employer careers URL.');
  }catch(e){if(e instanceof JobImportError)throw e;throw new JobImportError(controller.signal.aborted?'The job website took too long to respond. Please try again.':'Could not connect to the job website. Try the employer’s direct careers link.',502);}finally{clearTimeout(timer);}
}
function decode(text){const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',bull:'•',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”'};return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(m,c)=>{if(c[0]==='#'){const n=c[1].toLowerCase()==='x'?parseInt(c.slice(2),16):Number(c.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return named[c.toLowerCase()]??m;});}
export function plainText(html){return decode(String(html).replace(/<!--[^]*?-->/g,'').replace(/<(script|style|nav|footer|header|noscript|svg|form)\b[^>]*>[^]*?<\/\1\s*>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|h[1-6]|section|tr|ul|ol)>/gi,'\n').replace(/<li\b[^>]*>/gi,'• ').replace(/<[^>]+>/g,'')).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function jobPosting(data){if(!data||typeof data!=='object')return null;if(Array.isArray(data)){for(const child of data){const found=jobPosting(child);if(found)return found;}}else{if([data['@type']].flat().some(t=>t==='JobPosting'))return data;for(const child of Object.values(data)){const found=jobPosting(child);if(found)return found;}}return null;}
function field(value){if(typeof value==='string')return plainText(value);if(Array.isArray(value))return value.map(field).filter(Boolean).join('\n');if(value&&typeof value==='object')return field(value.name||value.value||'');return '';}
function locationOf(job){const locations=[job.jobLocation].flat().filter(Boolean).map(l=>{const a=l.address||{};return [a.addressLocality,a.addressRegion,typeof a.addressCountry==='object'?a.addressCountry.name:a.addressCountry].filter(Boolean).join(', ');}).filter(Boolean);if(job.jobLocationType==='TELECOMMUTE')locations.unshift('Remote');return [...new Set(locations)].join(' · ');}
export function extractHighlights(text,job={}){
  const groups={responsibilities:[],requirements:[],preferred:[],skills:[],compensation:[]};let section='';
  for(const raw of text.split('\n')){const line=raw.replace(/^[•\-\s]+/,'').trim();if(!line)continue;
    if(line.length<100&&/^(?:key |your |the )?(?:responsibilities|what you.ll (?:do|be doing)|what you will do|in this role|the role|duties|you will)\b/i.test(line)){section='responsibilities';continue;}
    if(line.length<100&&/^(?:minimum |basic |required |your |key )?(?:qualifications|requirements|what you.ll (?:need|bring)|what you bring|who you are|about you|what we.re looking for|you may be a good fit|you might (?:be|thrive)|you should have|what you have)\b/i.test(line)){section='requirements';continue;}
    if(line.length<100&&/^(?:preferred|nice.to.have|bonus|desired)/i.test(line)){section='preferred';continue;}
    if(line.length<100&&/^(?:benefits|compensation|salary|annual salary|pay range|perks|the annual compensation)/i.test(line)){section='compensation';if(/[$€£]/.test(line))groups.compensation.push(line);continue;}
    if(line.length<100&&/^(?:about us|about the company|equal opportunity|privacy|how to apply|our culture|logistics|deadline to apply)/i.test(line)){section='';continue;}
    if(section&&line.length>8)groups[section].push(line.slice(0,1200));
    if(/(?:\d+\+?\s*(?:-|–|to)?\s*\d*\s*years?\b|bachelor|master.s|ph\.?d|must have|required experience)/i.test(line)&&!groups.requirements.includes(line))groups.requirements.push(line.slice(0,1200));
    if(/(?:[$€£]\s*\d[\d,.]*\s*[kK]?|\b(?:USD|GBP|EUR)\s*\d)/.test(line)&&!groups.compensation.includes(line))groups.compensation.push(line.slice(0,1200));
  }
  for(const [target,keys] of Object.entries({responsibilities:['responsibilities'],requirements:['qualifications','experienceRequirements','educationRequirements'],skills:['skills'],compensation:['jobBenefits']}))for(const k of keys){const v=field(job[k]);if(v)groups[target].unshift(...v.split('\n').filter(Boolean));}
  const skillNames=['Python','SQL','JavaScript','TypeScript','Java','React','Node.js','Excel','Tableau','Power BI','AWS','Azure','GCP','Salesforce','Figma','Kubernetes','Docker','C++','C#','R','SAP','Agile','Scrum','project management','product management','communication','leadership','data analysis','machine learning'];
  for(const skill of skillNames){const pattern=skill.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp(`(?:^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`,'i').test(text))groups.skills.push(skill);}
  const salary=job.baseSalary;if(salary){const v=salary.value||{};const range=[v.minValue??v.value,v.maxValue].filter(x=>x!==undefined).join(' – ');if(range)groups.compensation.unshift([salary.currency,range,v.unitText].filter(Boolean).join(' '));}
  for(const k of Object.keys(groups))groups[k]=[...new Set(groups[k])].slice(0,30);
  return groups;
}
export function parseJobPage(html,sourceUrl){
  let job=null;for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([^]*?)<\/script\s*>/gi)){try{job=jobPosting(JSON.parse(m[1]));if(job)break;}catch{}}
  if(!job&&html.trim().startsWith('{')){try{job=jobPosting(JSON.parse(html));}catch{}}
  const main=html.match(/<(?:main|article)\b[^>]*>([^]*?)<\/(?:main|article)>/i)?.[1];
  const description=job?field(job.description):plainText(main||html.match(/<body\b[^>]*>([^]*?)<\/body>/i)?.[1]||html);
  if(description.length<120||(!job&&!/(?:qualifications|responsibilities|requirements|what you.ll|what you will|experience|salary)/i.test(description))||(!job&&/verify you are human|access denied|captcha|enable javascript|sign in to (?:view|continue)/i.test(description.slice(0,1800))))throw new JobImportError('No readable job description was found. The page may require sign-in or JavaScript. Try the employer’s direct job posting link.');
  const heading=html.match(/<h1\b[^>]*>([^]*?)<\/h1>/i)?.[1];
  return {description:description.slice(0,100000),role:field(job?.title)||plainText(heading||''),company:field(job?.hiringOrganization),location:job?locationOf(job):'',employmentType:field(job?.employmentType),datePosted:field(job?.datePosted),validThrough:field(job?.validThrough),sourceUrl,method:job?'Structured job posting':'Page text',parsedAt:new Date().toISOString(),highlights:extractHighlights(description,job||{})};
}
