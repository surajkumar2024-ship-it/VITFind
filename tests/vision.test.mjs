import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/domain.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {cosineSimilarity,distanceMetres}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const vector=(i)=>Array.from({length:512},(_,j)=>j===i?1:0);
test('visual similarity uses vectors rather than report text',()=>{
  assert.equal(cosineSimilarity(vector(0),vector(0)),1);
  assert.equal(cosineSimilarity(vector(0),vector(1)),0);
  assert.equal(cosineSimilarity(vector(0),vector(0).map(v=>-v)),-1);
});
test('invalid and zero image embeddings cannot produce matches',()=>{
  assert.equal(cosineSimilarity([1],[1]),null);
  assert.equal(cosineSimilarity(Array(512).fill(0),vector(0)),null);
  assert.equal(cosineSimilarity(Array(512).fill(NaN),vector(0)),null);
});
test('map distance handles missing, same and nearby pins',()=>{
  assert.equal(distanceMetres({},{}),null);
  assert.equal(distanceMetres({latitude:0,longitude:0},{latitude:0,longitude:0}),0);
  assert.ok(Math.abs(distanceMetres({latitude:0,longitude:0},{latitude:0,longitude:.001})-111.2)<1);
});
