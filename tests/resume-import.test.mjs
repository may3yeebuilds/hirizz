import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readResumeFile} from '../dist/resume-import.js';

test('text import normalizes line endings', async () => {
  assert.equal(await readResumeFile(new File([' Name\r\nSkills '], 'resume.TXT')), 'Name\nSkills');
});
test('Word import passes file bytes to plain text extractor', async () => {
  const file=new File(['word bytes'], 'resume.DOCX');
  const text=await readResumeFile(file,{extractRawText:async ({arrayBuffer})=>{
    assert.equal(new TextDecoder().decode(arrayBuffer),'word bytes');
    return {value:'Jane Doe\n\nPython and SQL\n\n'};
  }});
  assert.equal(text,'Jane Doe\n\nPython and SQL');
});
test('legacy, unsupported, oversized and unreadable files fail clearly', async () => {
  await assert.rejects(readResumeFile(new File(['x'],'resume.doc')), /older Word/);
  await assert.rejects(readResumeFile(new File(['x'],'resume.pdf')), /Choose a Word/);
  await assert.rejects(readResumeFile({size:5*1024*1024+1,name:'resume.docx'}), /5 MB/);
  await assert.rejects(readResumeFile(new File([' '],'resume.txt')), /No readable text/);
  await assert.rejects(readResumeFile(new File(['bad'],'resume.docx'),{extractRawText:async()=>{throw Error();}}), /Could not read/);
});
