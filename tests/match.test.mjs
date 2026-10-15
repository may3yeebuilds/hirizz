import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze,rankedLines} from '../dist/match.js';
test('score reflects exact unique keyword overlap',()=>{assert.equal(analyze('Python SQL','Python SQL Tableau').score,67);assert.deepEqual(analyze('Python SQL','Python SQL Tableau').missing,['tableau']);});
test('empty JD is safe',()=>assert.equal(analyze('Python','').score,0));
test('ranked evidence retains exact source text',()=>{const base='Name\nBuilt Python tools\nManaged budgets';const lines=rankedLines(base,'Python');assert.equal(lines[0].text,'Built Python tools');assert.ok(lines.every(l=>base.split('\n').includes(l.text)));});
