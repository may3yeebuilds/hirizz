import {resumeAnalysis} from './resume-analysis.js';
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function draftComparison(base,draft,job,changes){
  const before=resumeAnalysis(base,job.jd,job.parsedJob),after=resumeAnalysis(draft,job.jd,job.parsedJob);if(!before||!after)return '';
  const delta=after.ats-before.ats;
  return `<div class="draft-comparison" role="status"><span class="eyebrow">BASE RESUME → CURRENT DRAFT</span><div class="draft-scores"><div><span>Estimated ATS score</span><strong>${before.ats} → ${after.ats}<small>/100</small></strong></div><div><span>Keyword match</span><strong>${before.match.score}% → ${after.match.score}%</strong></div></div><p class="help">${delta>0?`Estimated ATS score improved by ${delta} points.`:delta<0?'This draft currently scores below the base resume. Review your edits.':'No estimated ATS score increase yet. Missing qualifications are never invented to raise a score.'} This is Hirizz’s text-based estimate, not an employer ATS result.</p></div>${changes?.length?`<details class="tailor-changes"><summary>What changed (${changes.length})</summary><ul>${changes.map(c=>`<li><strong>${esc(c.title)}</strong><p class="help">Supported by your base resume:</p><blockquote>${esc(c.evidence)}</blockquote></li>`).join('')}</ul></details>`:''}`;
}
