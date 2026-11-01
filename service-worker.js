// Reconstructed packaging companion: original v351 worker was not supplied intact.
const CACHE='deck-of-many-brews-v492';
const PRECACHE=['./index.html','./manifest.webmanifest','./asset-list.json','./icons/deck-of-many-brews-icon-192.png','./icons/deck-of-many-brews-icon-512.png'];
const ENTRY_POINTS=new Set([
  'index.html',
  'deck-v492-arcane-edition.html'
]);
const DECK_CACHE=/^deck-of-many-brews-v\d+$/;
let artworkJob=null,artworkList=null;

async function knownArtwork(cache){
  if(!artworkList){
    const request=new URL('./asset-list.json',self.registration.scope).href;
    const response=await cache.match(request)||await fetch(request);
    artworkList=(await response.json()).map(path=>new URL(path,self.registration.scope).href);
  }
  return artworkList;
}
async function cacheArtwork(priority=[],remaining=true){
  const cache=await caches.open(CACHE),known=await knownArtwork(cache);
  const first=priority.filter(url=>known.includes(url));
  async function save(url){
    if(await cache.match(url))return;
    try{const response=await fetch(url);if(response.ok)await cache.put(url,response)}catch(_){}
  }
  await Promise.all(first.map(save));
  if(!remaining)return;
  if(artworkJob)return artworkJob;
  // A bounded background pass, never an additional install barrier.
  artworkJob=(async()=>{for(const url of known)if(!first.includes(url))await save(url)})();
  try{await artworkJob}finally{artworkJob=null}
}

async function cacheRelease(){
  const cache=await caches.open(CACHE);
  await cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'})));
}
async function removeObsoleteDeckCaches(){
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name!==CACHE&&DECK_CACHE.test(name)).map(name=>caches.delete(name)));
}
function entryName(url,base){
  if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return'';
  const relative=url.pathname.slice(base.pathname.length).replace(/^\/+|\/+$/g,'');
  return relative||'index.html';
}

self.addEventListener('install',event=>event.waitUntil(cacheRelease()));
// Activation follows the existing user-approved update flow (or waits until
// old clients close). Cleanup is limited to known versioned Deck caches.
self.addEventListener('activate',event=>event.waitUntil(removeObsoleteDeckCaches().then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  if(event.data?.type==='CACHE_ARTWORK'){event.waitUntil(cacheArtwork(Array.isArray(event.data.priority)?event.data.priority:[],event.data.remaining!==false).catch(()=>{}));return;}
  if(event.data?.type==='SKIP_WAITING'){event.waitUntil(self.skipWaiting());return;}
  if(event.data?.type==='CACHE_LATEST')event.waitUntil(cacheRelease().then(()=>event.ports[0]?.postMessage({ok:true}),()=>event.ports[0]?.postMessage({ok:false})));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL(self.registration.scope),name=entryName(url,base);
  if(event.request.method!=='GET'||!name)return;
  if(name==='version.json'||name==='service-worker.js')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(ENTRY_POINTS.has(name)){
      const shell=await cache.match(new URL('./index.html',base).href,{ignoreSearch:true});
      if(shell)return shell;
    }
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    const response=await fetch(event.request);
    if(name.startsWith('assets/')&&response.ok)await cache.put(event.request,response.clone());
    return response;
  })());
});
