import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumeAnalysis} from '../dist/resume-analysis.js';
import {analysisHTML} from '../dist/analysis-view.js';
test('no fabricated score before resume and JD exist',()=>{assert.equal(resumeAnalysis('','Python'),null);assert.equal(resumeAnalysis('Python',''),null);});
test('estimated ATS uses disclosed weighting and checks',()=>{const r='Summary\nPython\nExperience\nBuilt Python tools in 2024 for 20 customers\nSkills\nPython SQL\nEducation\nme@example.com';const a=resumeAnalysis(r,'Python SQL Tableau');assert.equal(a.match.score,67);assert.equal(a.readiness,100);assert.equal(a.ats,77);assert.ok(a.checks.every(c=>c.pass));});
test('evidence lines are exact resume content and suggestions do not invent abilities',()=>{const r='Built Python reports';const a=resumeAnalysis(r,'Python SQL',{highlights:{skills:['Python','SQL']}});assert.deepEqual(a.skillMatch[0].evidence,[r]);assert.equal(a.skillMatch[1].matched,false);assert.ok(a.improvements[0].text.includes('Otherwise leave it out'));assert.ok(a.evidence.every(e=>e.lines.every(l=>r.split('\n').includes(l))));});
test('readiness alone never produces perfect ATS match',()=>{const a=resumeAnalysis('Summary\nExperience\nSkills\nEducation\nme@example.com\n2024 10 users','Kubernetes');assert.equal(a.match.score,0);assert.equal(a.ats,30);});
test('analysis renders escaped source text and score limitations',()=>{const html=analysisHTML('Built Python <img src=x> reports',{jd:'Python SQL'});assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('not an employer ATS result'));});
