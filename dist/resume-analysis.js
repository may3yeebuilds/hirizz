import {analyze,keywords} from './match.js';
const headings={summary:/^\s*(?:professional |career )?(?:summary|profile|objective)\s*:?\s*$/im,experience:/^\s*(?:(?:professional|work|relevant) )?(?:experience|employment(?: history)?|work history)\s*:?\s*$/im,skills:/^\s*(?:(?:technical|core|key) )?(?:skills|competencies|expertise)\s*:?\s*$/im,education:/^\s*(?:education|academic background|qualifications)\s*:?\s*$/im};
export function resumeAnalysis(resume,jd,parsedJob){
  if(!resume.trim()||!jd.trim())return null;
  const match=analyze(resume,jd),lines=resume.split('\n').filter(l=>l.trim());
  const skills=Array.isArray(parsedJob?.highlights?.skills)?parsedJob.highlights.skills.filter(s=>typeof s==='string'&&s.trim()):[];
  const words=new Set(keywords(resume));
  const skillMatch=skills.map(skill=>({skill,matched:keywords(skill).every(k=>words.has(k)),evidence:lines.filter(l=>keywords(skill).every(k=>keywords(l).includes(k))).slice(0,3)}));
  const checks=[...Object.entries(headings).map(([key,regex])=>({id:key,label:`Recognizable ${key} heading`,pass:regex.test(resume),suggestion:`Use a clear “${key[0].toUpperCase()+key.slice(1)}” heading above the relevant content so resume parsers can identify the section.`})),{id:'email',label:'Email address present',pass:/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(resume),suggestion:'Add a current email address so recruiters can contact you.'},{id:'dates',label:'Experience dates present',pass:/\b(?:19|20)\d{2}\b/.test(resume),suggestion:'Include accurate employment or education dates. Keep the date format consistent.'},{id:'achievements',label:'Measurable outcomes present',pass:/(?:\d+(?:\.\d+)?\s*%|[$£€]\s*\d|\b\d[\d,]*\s+(?:users|customers|clients|projects|people|hours|days|teams|reports|employees)\b)/i.test(resume),suggestion:'Where you have supporting records, include real outcomes such as time saved, customer counts, or percentage changes. Never estimate or invent results.'}];
  const readiness=Math.round(checks.filter(c=>c.pass).length/checks.length*100);
  const ats=Math.round(match.score*.7+readiness*.3);
  const improvements=[];
  const missingSkills=skillMatch.filter(s=>!s.matched).map(s=>s.skill);
  if(missingSkills.length)improvements.push({title:'Review skills mentioned in the posting',text:`Not found in your resume: ${missingSkills.join(', ')}. If you have this experience, make it explicit using the posting’s terminology. Otherwise leave it out and treat it as a qualification gap.`});
  if(match.missing.length)improvements.push({title:'Review missing job-description terms',text:`Start with ${match.missing.slice(0,12).join(', ')}. These are literal word gaps, including some general words. Only add relevant terms when your existing experience supports them.`});
  for(const c of checks.filter(c=>!c.pass))improvements.push({title:({summary:'Add a summary heading',experience:'Add an experience heading',skills:'Add a skills heading',education:'Add an education heading',email:'Add a contact email',dates:'Include accurate dates',achievements:'Show verified outcomes'})[c.id],text:c.suggestion});
  const evidence=match.matched.map(term=>({term,lines:lines.filter(l=>keywords(l).includes(term)).slice(0,2)}));
  const relevant=lines.map(text=>({text,hits:keywords(text).filter(t=>match.matched.includes(t)).length})).filter(l=>l.hits>0).sort((a,b)=>b.hits-a.hits).slice(0,3);
  if(relevant.length)improvements.push({title:'Make relevant experience easy to find',text:'Consider moving these existing statements higher in the relevant section. Preserve accurate dates, context, and wording.',evidence:relevant.map(l=>l.text)});
  return {match,checks,readiness,ats,improvements,skillMatch,evidence};
}
