import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSignatures,validateSignature,repairSignature} from '../src/index.js';
import {compileCss} from '../src/compiler/css.js';

test('Oracle Octaves is schema-valid and compiles accessible layered Phi controls',()=>{
  const sig=loadSignatures().find(s=>s.id==='oracle-octaves');
  assert.ok(sig);
  assert.deepEqual(validateSignature(sig),[]);
  const checks=repairSignature(sig);
  assert.deepEqual(checks.repairs,[]);
  assert.ok(checks.checks.every(c=>c.status==='pass'));
  assert.equal(sig.colors.surface,'#ffffff');
  assert.equal(sig.colors.accent,'#8f202d');
  assert.equal(sig.navigation.default,'top-bar');
  const css=compileCss(sig);
  assert.match(css,/--tap:44px/);
  assert.match(css,/--bg:/);
});
