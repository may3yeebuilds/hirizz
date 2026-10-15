import {resumeAnalysis} from './resume-analysis.js';
const aliases=[['AWS','Amazon Web Services'],['GCP','Google Cloud Platform'],['SQL','Structured Query Language'],['SEO','search engine optimization'],['CRM','customer relationship management'],['HTML','Hypertext Markup Language'],['CSS','Cascading Style Sheets'],['API','application programming interface'],['ETL','extract transform load'],['CI/CD','continuous integration and continuous delivery']];
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const termRegex=term=>new RegExp(`(?<![a-z0-9])${escapeRegex(term)}(?![a-z0-9])`,'i');
const negative=/\b(?:not|never|no|without|lack|lacking|learning|aspiring|interested in|want to learn|seeking to learn)\b/i;
export function tailorResume(base,jd,parsedJob){
  if(!base.trim())throw Error('Save a base resume before tailoring.');
  if(!jd.trim())throw Error('Import the job description before tailoring.');
  const sourceLines=base.replace(/\r\n?/g,'\n').split('\n');let lines=[...sourceLines];const changes=[];
  const before=resumeAnalysis(base,jd,parsedJob);
  // Only replace entire section headings, keeping all employment records in order.
  const headingMap=[[/^(?:career history|professional background|employment background)$/i,'Experience'],[/^(?:capabilities|technical expertise|core competencies|areas of expertise)$/i,'Skills'],[/^(?:academic qualifications|academic history|educational background)$/i,'Education'],[/^(?:professional overview|career overview|executive profile)$/i,'Summary']];
  lines=lines.map(line=>{const heading=line.trim().replace(/:$/,'');for(const [pattern,value] of headingMap)if(pattern.test(heading)){changes.push({title:`Standardized “${heading}” to “${value}”`,evidence:line});return value;}return line;});
  for(const [short,long] of aliases){
    const shortRE=termRegex(short),longRE=termRegex(long);let source,target;
    if(longRE.test(jd)&&!longRE.test(lines.join('\n'))){source=short;target=long;}
    else if(shortRE.test(jd)&&!shortRE.test(lines.join('\n'))){source=long;target=short;}
    if(!source)continue;const re=termRegex(source);const index=lines.findIndex(l=>re.test(l)&&!negative.test(l));if(index<0)continue;
    const evidence=sourceLines[index];lines[index]=lines[index].replace(re,match=>`${match} (${target})`);changes.push({title:`Added the equivalent term “${target}” alongside “${source}”`,evidence});
  }
  const catalog=['Python','SQL','Excel','JavaScript','TypeScript','Java','React','AWS','GCP','Azure','Tableau','Power BI','Salesforce','Figma','Docker','Kubernetes','Agile','Scrum'];
  const extracted=Array.isArray(parsedJob?.highlights?.skills)?parsedJob.highlights.skills.filter(s=>typeof s==='string'&&s.trim()):[];
  const skills=[...new Set([...extracted,...catalog])].filter(skill=>termRegex(skill).test(jd));
  const supported=skills.filter(skill=>lines.some(line=>!negative.test(line)&&termRegex(skill).test(line)&&/\b(?:built|developed|used|implemented|managed|created|delivered|analyzed|designed|maintained|led|worked with)\b/i.test(line)));
  if(supported.length&&!/^\s*(?:(?:technical|core|key) )?(?:skills|competencies|expertise)\s*:?\s*$/im.test(lines.join('\n'))){lines.push('','Skills', [...new Set(supported)].join(' · '));changes.push({title:'Added a Skills section using skills already demonstrated in your resume',evidence:base.split('\n').filter(l=>supported.some(s=>termRegex(s).test(l))&&!negative.test(l)).join('\n')});}
  let text=lines.join('\n').trim();let after=resumeAnalysis(text,jd,parsedJob);
  // Never trade away measured match or ATS score for a cosmetic transformation.
  if(after.ats<before.ats||after.match.score<before.match.score){text=base.trim();after=before;changes.length=0;}
  return {text,before,after,changes,createdAt:new Date().toISOString()};
}
