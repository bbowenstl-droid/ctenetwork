/* Same-origin assets only; live Sleeper responses are never served from this cache. */
const CACHE='cte-network-v34';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./offline.html'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('cte-network-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 const cacheable=r.mode==='navigate'||/\.(css|js|png|webp|svg|webmanifest)$/.test(u.pathname);if(!cacheable)return;
 e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(r);if(response.ok){await cache.put(r,response.clone());const keys=await cache.keys();if(keys.length>180){const victim=keys.find(k=>!k.url.endsWith('/offline.html'));if(victim)await cache.delete(victim)}}return response}catch(_){const saved=await cache.match(r);if(saved)return saved;if(r.mode==='navigate')return await cache.match('./offline.html');return Response.error()}})())});
