const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let checked=0,failed=0;
function check(code,name,module=false){const r=spawnSync(process.execPath,['--check','--input-type='+ (module?'module':'commonjs')],{input:code,encoding:'utf8'});checked++;if(r.status){console.error(name+'\n'+r.stderr);failed++;}}
for(const dir of ['','js','data'])for(const f of fs.readdirSync(path.join(root,dir)))if(f.endsWith('.js'))check(fs.readFileSync(path.join(root,dir,f),'utf8'),path.join(dir,f),f==='firebase-bridge.js');
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(root,f),'utf8');let n=0;for(const [,attrs,code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=/.test(attrs)||!code.trim()||/application\/(ld\+)?json/.test(attrs))continue;check(code,f+' inline '+(++n),/type\s*=\s*["']module["']/.test(attrs));}}
console.log(`${failed?'FAIL':'PASS'}: ${checked} JavaScript files/inline scripts checked`);process.exitCode=failed?1:0;
