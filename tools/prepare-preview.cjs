const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.preview');fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(root)){const from=path.join(root,name);if(fs.statSync(from).isFile()&&/\.(html|js|css|png|webp|svg|webmanifest|json)$/.test(name))fs.copyFileSync(from,path.join(out,name));}
for(const name of ['css','js','data','tests/visual'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
console.log('Prepared ignored local preview; production configuration unchanged.');
