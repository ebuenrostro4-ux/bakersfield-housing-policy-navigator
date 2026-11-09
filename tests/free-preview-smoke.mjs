import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const base='http://127.0.0.1:3107';
const child=spawn(process.execPath,['scripts/start-free-preview.mjs'],{env:{...process.env,APP_URL:base,PORT:'3107',DATABASE_URL:'file:/tmp/navigator-no-database-preview-test/unused.db'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
try{let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/api/session')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
for(const path of ['/api/session','/api/password-reset','/api/policies','/api/tasks','/api/users']){const r=await fetch(base+path,{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403,path);}
for(const path of ['/api/documents','/api/archive','/api/compare','/api/policies/meeting-checklist/export'])assert.equal((await fetch(base+path)).status,403,path);
const fd=new FormData();fd.append('file',new File(['Public source text to exercise extraction without storing server documents.'],'source.txt'));
const r=await fetch(base+'/api/free-preview/extract',{method:'POST',headers:{origin:base},body:fd});assert.equal(r.status,200);assert.ok((await r.json()).document.text.includes('Public source text'));
assert.equal((await fetch(base+'/api/free-preview/extract',{method:'POST',headers:{origin:'https://untrusted.example'},body:fd})).status,403);
console.log('11 public-preview API isolation, extraction, and CSRF checks passed.');
}finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
