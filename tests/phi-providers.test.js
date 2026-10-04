import test from 'node:test';
import assert from 'node:assert/strict';
import { candidatesFromApiPhi, candidateFromQuantAI } from '../src/tools/phi-providers.js';

test('APIPhi catalog becomes one scanner candidate without losing API capabilities',()=>{
 const [candidate]=candidatesFromApiPhi({
  schema:'phi.capability-catalog',
  candidates:[
   {id:'market',capabilities:['product-search','item-details']},
   {id:'stocks',capabilities:['stock-quotes']},
   {id:'metals',capabilities:['metals-prices']}
  ]
 },{lastPushed:'2026-10-04T00:00:00Z'});
 assert.equal(candidate.repository,'www-infinity4/APIPhi');
 assert.deepEqual(candidate.capabilities,['product-search','item-details','stock-quotes','metals-prices']);
 assert.equal(candidate.networkAtRuntime,true);
});

test('Quant-AI provider maps only advertised capability ids',()=>{
 const candidate=candidateFromQuantAI({
  schema:'phi.capability-provider',
  capabilities:[
   {id:'quant-owned',path:'/api/quants/owned'},
   {id:'inventory-experiment',path:'/api/inventory/experiments'}
  ],
  denied:[{id:'quant-transfer'}]
 },{lastPushed:'2026-10-04T00:00:00Z'});
 assert.deepEqual(candidate.capabilities,['quant-owned','inventory-experiment']);
 assert.equal(candidate.capabilities.includes('quant-transfer'),false);
});

test('unknown provider schemas are rejected',()=>{
 assert.throws(()=>candidatesFromApiPhi({schema:'wrong'}),/unsupported/);
 assert.throws(()=>candidateFromQuantAI({schema:'wrong'}),/unsupported/);
});
