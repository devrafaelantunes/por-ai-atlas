const STORAGE_KEY = 'porai-atlas-v1';
const REGIONS = { Europe: 'Europa', Asia: 'Ásia', Africa: 'África', Americas: 'Américas', Oceania: 'Oceania' };
const REGION_ICONS = { Europe: '✦', Asia: '◈', Africa: '☼', Americas: '◉', Oceania: '〰' };
const TIERS = { muito: '🔥 Quero muito!', 'um-dia': '🌤️ Um dia eu vou', 'se-der': '🍃 Se der certo' };
let countries = [], entries = {}, currentView = 'home', currentRegion = 'all', currentList = 'visited', currentTier = 'all', selectedCountry = null, selectedStatus = 'none';
let cloud = null, deviceUid = null, ownerUid = null, connected = false, syncing = false, stopEntries = null, stopMember = null, stopRequests = null;
const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entry = code => entries[code] || { status: 'none', tier: 'muito', note: '', year: '' };
function loadEntries() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); return true; } catch { toast('Não foi possível salvar neste navegador. Exporte seus dados.'); return false; } }
function syncStatus(text) { $('syncStatus').textContent=text; }
async function connectCloud() {
  if (syncing || connected || !cloud || !ownerUid) return;
  syncing=true; syncStatus('Sincronizando…');
  try {
    const migrationKey=`${STORAGE_KEY}-migrated-${ownerUid}`;
    if (!localStorage.getItem(migrationKey)) {
      const local=loadEntries();
      const missing=Object.fromEntries(Object.entries(local).filter(([code,item])=>countries.some(c=>c.code===code)&&['visited','dream'].includes(item?.status)));
      if (Object.keys(missing).length) {
        localStorage.setItem(`${STORAGE_KEY}-backup-before-sync-${ownerUid}`,JSON.stringify(local));
        await cloud.uploadMissing(ownerUid,missing);
      }
      localStorage.setItem(migrationKey,'1');
    }
    stopEntries=cloud.watchEntries(ownerUid,latest=>{ entries=latest; persist(); render(); syncStatus('Sincronizado no Firebase'); },error=>{console.error('Sincronização',error);connected=false;syncStatus('Sem conexão · suas marcações locais continuam aqui');});
    connected=true;
  } catch(error) { console.error('Conexão ao atlas',error);syncStatus('Falha na sincronização · dados locais preservados'); }
  finally { syncing=false; }
}
function listenRequests() {
  if(stopRequests)return;
  $('ownerPanel').classList.remove('hidden'); $('atlasCode').value=ownerUid;
  stopRequests=cloud.watchRequests(ownerUid,requests=>{
    $('pendingRequests').innerHTML=requests.length?requests.map(request=>`<div class="pair-request"><span>Código <b>${escapeHtml(request.code)}</b></span><button type="button" data-approve="${escapeHtml(request.uid)}">Autorizar aparelho</button></div>`).join(''):'Nenhum aparelho aguardando.';
  },error=>console.error('Pedidos de vínculo',error));
}
async function startCloud() {
  try {
    cloud=await import('./cloud-bundle.js'); deviceUid=await cloud.identity(); ownerUid=cloud.ownerFor(deviceUid);
    $('atlasCode').value=ownerUid;
    if (ownerUid===deviceUid) {
      await connectCloud(); listenRequests();
    } else {
      $('ownerPanel').classList.add('hidden');
      stopMember=cloud.watchMember(ownerUid,deviceUid,allowed=>{if(allowed){connectCloud();listenRequests();}else syncStatus('Aguardando autorização no primeiro aparelho');},error=>{console.error('Vínculo',error);syncStatus('Não foi possível verificar o vínculo');});
    }
  } catch(error) {console.error('Firebase',error);syncStatus('Nuvem indisponível · dados locais preservados');}
}
async function requestPairing() {
  if (!cloud || !deviceUid) { toast('Aguarde o Firebase conectar.'); return; }
  const code=$('joinAtlasCode').value.trim();
  const confirmation=cloud.pairingCode();
  try {
    await cloud.requestAccess(code,deviceUid,confirmation);
    ownerUid=code; $('ownerPanel').classList.add('hidden'); $('pairConfirmation').textContent=`Confirme o código ${confirmation} no primeiro aparelho.`;
    if(stopEntries){stopEntries();stopEntries=null;} if(stopRequests){stopRequests();stopRequests=null;} connected=false;
    if(stopMember)stopMember();
    stopMember=cloud.watchMember(ownerUid,deviceUid,allowed=>{if(allowed){$('pairConfirmation').textContent='Aparelho vinculado!';connectCloud();listenRequests();}else syncStatus('Aguardando autorização no primeiro aparelho');},error=>{console.error('Vínculo',error);syncStatus('Não foi possível verificar o vínculo');});
  } catch(error) {console.error('Pedido de vínculo',error);toast('Código inválido ou Firebase indisponível.');}
}
async function approvePairing(uid) {
  if (!cloud || !uid || !confirm('O código mostrado no outro aparelho confere? Só autorize se você iniciou esse vínculo.')) return;
  try {await cloud.approve(ownerUid,uid);toast('Aparelho autorizado.');}
  catch(error) {console.error('Aprovação',error);toast('Não foi possível autorizar o aparelho.');}
}
function toast(message) { const old = document.querySelector('.toast'); if (old) old.remove(); const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role','status'); el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3200); }
function navigate(view) { currentView = view; document.querySelectorAll('.view').forEach(el => el.classList.toggle('hidden', el.id !== `${view}View`)); document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view)); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function render() { if (currentView === 'home') renderHome(); if (currentView === 'explore') renderExplore(); if (currentView === 'map') renderMap(); if (currentView === 'lists') renderLists(); }
let mapPaths = null, mapScale = 1, mapX = 0, mapY = 0, mapBusy = false;
function mapTransform() { mapX = Math.max(960*(1-mapScale), Math.min(0,mapX)); mapY = Math.max(500*(1-mapScale),Math.min(0,mapY)); $('mapShapes').setAttribute('transform',`translate(${mapX} ${mapY}) scale(${mapScale})`); }
function mapZoom(factor) { const old = mapScale; mapScale = Math.max(1,Math.min(5,mapScale*factor)); mapX = 480-(480-mapX)*mapScale/old; mapY = 250-(250-mapY)*mapScale/old; mapTransform(); }
async function renderMap() {
  if (!mapPaths && !mapBusy) { mapBusy=true; try { const response=await fetch('world-map.json'); if(!response.ok)throw Error(); mapPaths=await response.json(); if(mapPaths.length<195)throw Error(); const layer=$('mapShapes'); const ns='http://www.w3.org/2000/svg'; for(const shape of mapPaths){ const c=countries.find(x=>x.code===shape.code); if(!c)continue; const p=document.createElementNS(ns,'path'); p.setAttribute('d',shape.d); p.setAttribute('data-map-country',shape.code); p.setAttribute('tabindex','0'); p.setAttribute('role','button'); p.setAttribute('aria-label',c.name); const title=document.createElementNS(ns,'title');title.textContent=c.name;p.append(title);layer.append(p); } } catch { toast('Não foi possível carregar o mapa. Tente novamente.'); } finally {mapBusy=false;} }
  document.querySelectorAll('[data-map-country]').forEach(p=>{p.setAttribute('class',`map-country ${entry(p.getAttribute('data-map-country')).status}`);});
}
function initMapEvents() {
  const svg=$('worldMap'), tip=$('mapTooltip'); let drag=null;
  svg.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,startX:mapX,startY:mapY,code:e.target.getAttribute('data-map-country'),moved:false};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){const scale=960/svg.getBoundingClientRect().width;mapX=drag.startX+dx*scale;mapY=drag.startY+dy*scale;mapTransform();tip.classList.add('hidden');}return;}const code=e.target.getAttribute('data-map-country');if(!code){tip.classList.add('hidden');return;}const c=countries.find(x=>x.code===code);tip.textContent=`${c.flag} ${c.name} · ${entry(code).status==='visited'?'já fui':entry(code).status==='dream'?'quero ir':'não marcado'}`;const box=$('mapStage').getBoundingClientRect();tip.style.left=`${Math.min(e.clientX-box.left+12,box.width-180)}px`;tip.style.top=`${e.clientY-box.top-35}px`;tip.classList.remove('hidden');});
  svg.addEventListener('pointerup',e=>{if(drag&&!drag.moved&&drag.code)openCountry(drag.code);drag=null;});svg.addEventListener('pointercancel',()=>drag=null);svg.addEventListener('pointerleave',()=>tip.classList.add('hidden'));
  svg.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.hasAttribute('data-map-country')){e.preventDefault();openCountry(e.target.getAttribute('data-map-country'));}});
  $('zoomIn').addEventListener('click',()=>mapZoom(1.5));$('zoomOut').addEventListener('click',()=>mapZoom(1/1.5));$('zoomReset').addEventListener('click',()=>{mapScale=1;mapX=mapY=0;mapTransform();});
}
function renderHome() {
  const visited = countries.filter(c => entry(c.code).status === 'visited');
  const dreams = countries.filter(c => entry(c.code).status === 'dream');
  $('visitedCount').textContent = visited.length; $('dreamCount').textContent = dreams.length;
  $('regionCount').textContent = `${new Set(visited.map(c => c.region)).size}/5`;
  const sorted = dreams.sort((a,b) => Object.keys(TIERS).indexOf(entry(a.code).tier) - Object.keys(TIERS).indexOf(entry(b.code).tier) || a.name.localeCompare(b.name,'pt-BR')).slice(0,3);
  $('topDreams').innerHTML = sorted.length ? sorted.map(c => `<div class="mini-row" data-country="${c.code}" role="button" tabindex="0"><span class="flag">${c.flag}</span><span><b>${escapeHtml(c.name)}</b><small>${TIERS[entry(c.code).tier] || TIERS.muito}</small></span><span class="arrow">↗</span></div>`).join('') : '<p class="empty-mini">Sua próxima aventura começa aqui. Escolha um país que você sonha conhecer. ✨</p>';
  $('regionProgress').innerHTML = Object.keys(REGIONS).map(r => { const n = visited.filter(c => c.region === r).length; const total = countries.filter(c => c.region === r).length; return `<div class="region-row"><span>${REGIONS[r]}</span><div class="progress-track"><div class="progress-fill" style="width:${n/total*100}%"></div></div><b>${n}</b></div>`; }).join('');
}
function renderExplore() {
  $('regionTabs').innerHTML = [['all','Todos'],...Object.entries(REGIONS)].map(([key,label]) => `<button data-region="${key}" class="${currentRegion===key?'active':''}">${key==='all'?'✳':REGION_ICONS[key]} ${label}</button>`).join('');
  const q = clean($('searchInput').value.trim()), status = $('statusFilter').value;
  const shown = countries.filter(c => (currentRegion==='all'||c.region===currentRegion) && (status==='all'||entry(c.code).status===status) && (!q||clean(`${c.name} ${c.english} ${c.capital}`).includes(q)));
  $('resultCount').textContent = `${shown.length} ${shown.length===1?'PAÍS ENCONTRADO':'PAÍSES ENCONTRADOS'}`;
  $('countryGrid').innerHTML = shown.map(c => { const s = entry(c.code).status; return `<button class="country-card" data-country="${c.code}" aria-label="${escapeHtml(c.name)}, ${s==='visited'?'já visitei':s==='dream'?'quero visitar':'sem marcação'}"><span class="card-flag">${c.flag}</span>${s==='visited'?'<span class="card-badge badge-visited">✓ JÁ FUI</span>':s==='dream'?'<span class="card-badge badge-dream">✧ QUERO IR</span>':''}<span class="card-name">${escapeHtml(c.name)}</span><span class="card-region">${REGIONS[c.region]}</span></button>`; }).join('');
  $('emptyExplore').classList.toggle('hidden', shown.length !== 0);
}
function renderLists() {
  const visited = countries.filter(c => entry(c.code).status==='visited'); const dreams = countries.filter(c => entry(c.code).status==='dream');
  $('visitedTabCount').textContent = visited.length; $('dreamTabCount').textContent = dreams.length;
  document.querySelectorAll('[data-list]').forEach(el => el.classList.toggle('active',el.dataset.list===currentList));
  $('tierFilter').classList.toggle('hidden',currentList!=='dream');
  $('tierFilter').innerHTML = [['all','Todos'],...Object.entries(TIERS)].map(([key,label]) => `<button data-tier="${key}" class="${currentTier===key?'active':''}">${label}</button>`).join('');
  const list = currentList==='visited'?visited.sort((a,b)=>(Number(entry(b.code).year)||0)-(Number(entry(a.code).year)||0)||a.name.localeCompare(b.name,'pt-BR')):dreams;
  if (!list.length) { $('listContent').innerHTML = `<div class="empty-state"><span>${currentList==='visited'?'✈':'✧'}</span><h3>${currentList==='visited'?'Sua história começa aqui':'O próximo destino te espera'}</h3><p>${currentList==='visited'?'Marque os países que você já conheceu.':'Adicione países à sua lista de desejos.'}</p><button data-go="explore">Explorar países ↗</button></div>`; return; }
  if (currentList==='visited') { $('listContent').innerHTML = list.map(c => listRow(c)).join(''); return; }
  const tiers = currentTier==='all'?Object.keys(TIERS):[currentTier];
  const html = tiers.map(t => { const group = list.filter(c => entry(c.code).tier===t).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')); return group.length ? `<h3 class="tier-heading">${TIERS[t]} <small>${group.length} ${group.length===1?'país':'países'}</small></h3>${group.map(c=>listRow(c)).join('')}` : ''; }).join('');
  $('listContent').innerHTML = html || '<div class="empty-state"><span>✧</span><h3>Nada neste tier ainda</h3><p>Escolha outro nível de vontade ou adicione mais destinos.</p></div>';
}
function listRow(c) { const e = entry(c.code); return `<div class="list-row" data-country="${c.code}" role="button" tabindex="0"><span class="flag">${c.flag}</span><div class="info"><b>${escapeHtml(c.name)}</b><small>${REGIONS[c.region]}${e.year&&e.status==='visited'?' · '+escapeHtml(e.year):''}${e.note?' · '+escapeHtml(e.note):''}</small></div><span class="row-end">↗</span></div>`; }
function setStatus(status) { selectedStatus = status; document.querySelectorAll('[data-status]').forEach(el => el.classList.toggle('selected',el.dataset.status===status)); $('tierSection').classList.toggle('hidden',status!=='dream'); $('yearSection').classList.toggle('hidden',status!=='visited'); $('noteSection').classList.toggle('hidden',status==='none'); }
function openCountry(code) { const c = countries.find(x=>x.code===code); if (!c) return; selectedCountry=c; const e=entry(code); $('dialogFlag').textContent=c.flag; $('dialogRegion').textContent=REGIONS[c.region]+' · '+c.subregion; $('dialogName').textContent=c.name; $('dialogSub').textContent=c.capital?`Capital: ${c.capital}`:'Um destino para descobrir.'; $('tierSelect').value=TIERS[e.tier]?e.tier:'muito'; $('yearInput').value=e.year||''; $('noteInput').value=e.note||''; setStatus(['visited','dream'].includes(e.status)?e.status:'none'); $('countryDialog').showModal(); }
async function saveCountry(event) { event.preventDefault(); if (!selectedCountry || syncing) return; const code=selectedCountry.code, before=entries[code]; let next=null; if (selectedStatus!=='none') { const year=$('yearInput').value.trim(); if (selectedStatus==='visited' && year && (Number(year)<1900||Number(year)>2100)) { toast('Digite um ano entre 1900 e 2100.'); return; } next={status:selectedStatus,tier:selectedStatus==='dream'?$('tierSelect').value:'muito',year:selectedStatus==='visited'?year:'',note:$('noteInput').value.trim().slice(0,500)}; }
  $('saveCountry').disabled=true;
  try {
    if (cloud && !connected) throw Error('Sincronização indisponível');
    if (connected) await cloud.saveCountry(ownerUid,code,next);
    if(next)entries[code]=next;else delete entries[code];
    if(!persist())throw Error('local');
    $('countryDialog').close(); render(); toast(selectedStatus==='none'?'País removido da sua jornada.':connected?'Salvo e sincronizado!':'Salvo neste navegador · nuvem indisponível.');
  } catch(error) {console.error('Erro ao salvar país',error);if(before)entries[code]=before;else delete entries[code];toast('Não foi possível salvar. Tente novamente.');}
  finally {$('saveCountry').disabled=false;}
}
function exportData() { const blob=new Blob([JSON.stringify({app:'por-ai',version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='por-ai-meu-atlas.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
async function importData(file) { try { if (file.size>2_000_000) throw Error('Arquivo grande demais.'); const data=JSON.parse(await file.text()); if (data.app!=='por-ai'||data.version!==1||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries)) throw Error('Este arquivo não é um backup válido do por aí.'); const validCodes=new Set(countries.map(c=>c.code)), next={}; for (const [code,item] of Object.entries(data.entries)) { if (!validCodes.has(code)||!item||!['visited','dream'].includes(item.status)) continue; next[code]={status:item.status,tier:TIERS[item.tier]?item.tier:'muito',year:/^(19|20)\d{2}$/.test(String(item.year||''))?String(item.year):'',note:String(item.note||'').slice(0,500)}; } if (!confirm(`Importar ${Object.keys(next).length} países? Isso substitui suas marcações ${connected?'em todos os aparelhos vinculados':'neste dispositivo'}.`)) return;
    if (cloud && !connected) throw Error('Aguarde a sincronização para importar.');
    if (connected) await cloud.replaceCountries(ownerUid,entries,next);
    const previous=entries; entries=next;
    if (!persist()) { entries=previous; return; }
    $('dataDialog').close(); render(); toast('Seu atlas foi importado neste navegador!');
  } catch(err) { console.error('Erro ao importar',err); toast(err.message||'Não foi possível importar o arquivo.'); } finally { $('importInput').value=''; } }
async function init() {
  entries=loadEntries(); initMapEvents();
  try { const response=await fetch('countries.json'); if (!response.ok) throw Error('Falha ao carregar países'); countries=await response.json(); if (!Array.isArray(countries)||countries.length!==195) throw Error('Lista incompleta'); render(); }
  catch { document.querySelector('.page-heading').insertAdjacentHTML('afterend','<div class="error-banner">Não foi possível carregar a lista de países. Verifique a conexão e <button onclick="location.reload()">tente de novo</button>.</div>'); }
  document.addEventListener('click',event=>{ const go=event.target.closest('[data-go]'); if(go){navigate(go.dataset.go);return;} const nav=event.target.closest('[data-view]'); if(nav){navigate(nav.dataset.view);return;} const country=event.target.closest('[data-country]'); if(country){openCountry(country.dataset.country);return;} const region=event.target.closest('[data-region]'); if(region){currentRegion=region.dataset.region;renderExplore();return;} const list=event.target.closest('[data-list]'); if(list){currentList=list.dataset.list;currentTier='all';renderLists();return;} const tier=event.target.closest('[data-tier]'); if(tier){currentTier=tier.dataset.tier;renderLists();return;} const status=event.target.closest('[data-status]'); if(status)setStatus(status.dataset.status); });
  document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-country][role="button"]')){event.preventDefault();openCountry(event.target.dataset.country);}});
  $('searchInput').addEventListener('input',renderExplore); $('statusFilter').addEventListener('change',renderExplore); $('countryForm').addEventListener('submit',saveCountry);
  $('dataButton').addEventListener('click',()=>$('dataDialog').showModal()); $('closeData').addEventListener('click',()=>$('dataDialog').close()); $('exportButton').addEventListener('click',exportData); $('importInput').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));
  $('joinButton').addEventListener('click',requestPairing);
  $('copyCode').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('atlasCode').value);toast('Código copiado.');}catch{toast('Selecione e copie o código.');}});
  $('pendingRequests').addEventListener('click',event=>{const button=event.target.closest('[data-approve]');if(button)approvePairing(button.dataset.approve);});
  startCloud();
}
init();
