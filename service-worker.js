'use strict';
// Hosting bundle v520-r1. Scope-specific ownership excludes saved records and AI caches.
const RELEASE='v520-r1';
const ROOT=self.registration.scope;
const PREFIX='deck-hosted:'+ROOT+':';
const CACHE=PREFIX+RELEASE;
const FILES=['./index.html','./manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png'];
const urls=FILES.map(path=>new URL(path,ROOT).href);
async function refresh(){
 const responses=await Promise.all(urls.map(async url=>{const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));if(!response.ok||response.type==='opaque')throw Error('Required offline file unavailable');return response;}));
 const cache=await caches.open(CACHE);
 await Promise.all(responses.map((response,i)=>cache.put(urls[i],response)));
}
self.addEventListener('install',event=>{event.waitUntil(refresh());});
// Wait for the app's existing update confirmation before replacing an active worker.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})());});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type==='CACHE_LATEST')event.waitUntil(refresh().then(()=>event.ports[0]?.postMessage({ok:true})).catch(()=>event.ports[0]?.postMessage({ok:false})));
 // CACHE_ARTWORK contains data URIs in this distribution; all artwork is in index.html.
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(ROOT))return;
 const plain=new URL(url);plain.search='';plain.hash='';
 if(plain.href===new URL('./version.json',ROOT).href){
  event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(plain.href)||Response.error();}));return;
 }
 const root=new URL(ROOT);
 const isEntry=plain.pathname===root.pathname||plain.href===new URL('./index.html',ROOT).href;
 const key=isEntry?new URL('./index.html',ROOT).href:plain.href;
 if(plain.href.startsWith(new URL('./ai/',ROOT).href)){event.respondWith((async()=>{const cache=await caches.open('deck-ai-runtime-v520:'+ROOT);const hit=await cache.match(plain.href);if(hit)return hit;const response=await fetch(request);if(response.ok)await cache.put(plain.href,response.clone());return response;})());return;}
 if(!isEntry&&!urls.includes(key))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(key);return hit||fetch(request);})());
});
