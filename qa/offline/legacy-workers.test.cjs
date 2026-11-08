const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Nistar activation preserves all other games and shared legacy offline downloads',async()=>{
 const handlers={},deleted=[];
 const existing=['hg-v49-landscape-rail-fit','hg-v2','hg-offline-shell-grace','arcade-mobile-shell-release','arcade-mobile-assets','arcade-hub-mobile-assets','playables-mobile-assets','neon-game-arcade-mobile-assets','nistar-obsolete'];
 const self={addEventListener:(kind,fn)=>handlers[kind]=fn,clients:{claim:async()=>{}},skipWaiting:()=>{}};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../Nistar/sw.js'),'utf8'),{self,caches:{keys:async()=>existing,delete:async name=>deleted.push(name)},URL,location:{origin:'https://offline.invalid'}});
 let task;handlers.activate({waitUntil:promise=>task=promise});await task;
 assert.deepEqual(deleted,['nistar-obsolete']);
});
