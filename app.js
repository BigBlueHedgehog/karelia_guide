/* Buildless application. No runtime fetch is needed for content or photographs. */
'use strict';
(() => {
const $ = s => document.querySelector(s);
const data = window.PLACES || [];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => s.toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
const classes = {'Природа':'nature','Наследие':'heritage','Культура':'culture'};
let category='Все', route=null, selected=null, map=null, group=null, base=null, timer=null, photoIndex=0, activeRoute=null, routeLayer=null;
const markers = new Map();
const dialog=$('#detail');
function setHash(hash){try{history.replaceState(null,'',hash);}catch{location.hash=hash;}}
const visible = () => data.filter(p => (category==='Все'||p.category===category) && (!route||route.includes(p.id)) && normalize([p.name,p.subtitle,p.region,p.category,p.point].join(' ')).includes(normalize($('#search').value)));
function icon(p) { return L.divIcon({className:'marker-icon',html:`<div class="pin ${classes[p.category]} ${selected===p.id?'selected':''}"><span>${p.n}</span></div>`,iconSize:[34,42],iconAnchor:[17,37],tooltipAnchor:[0,-35]}); }
function render() {
 const places=visible();
 $('#count').textContent=`${places.length} ИЗ ${data.length} МЕСТ${route?' · МАРШРУТ':''}`;
 $('#places').innerHTML=places.length?places.map(p=>`<button class="place-item ${selected===p.id?'selected':''}" data-id="${p.id}" aria-label="${esc(p.name)} — открыть карточку" aria-pressed="${selected===p.id}"><img src="${p.image}" alt="" loading="lazy" width="65" height="63"><span><h3>${esc(p.name)}</h3><small>${esc(p.subtitle)}</small><span class="category-label">${String(p.n).padStart(2,'0')} / ${esc(p.category)}</span></span><span class="arrow" aria-hidden="true">↗</span></button>`).join(''):'<p class="empty">Мест не найдено. Попробуйте другое название или сбросьте фильтры.</p>';
 drawRoute();
 if(group){group.clearLayers(); markers.clear();places.forEach(p=>{const marker=L.marker(p.coords,{icon:icon(p),title:p.name,alt:p.name,keyboard:true,riseOnHover:true}).bindTooltip(esc(p.name),{direction:'top'}).on('click',()=>openPlace(p.id));group.addLayer(marker);markers.set(p.id,marker);});}
}
const point=id=>data.find(p=>p.id===id).coords;
const SORTAVALA=[61.704,30.691], PETROZAVODSK=[61.784,34.374], BELOMORSK=[64.524,34.762], PYA=[65.767,31.090];
const ROUTES=[
 {title:'Приладожье · 3 дня',note:'Три выезда из Сортавалы. Линии показывают связи между остановками; обратные переезды не показаны.',bases:[{name:'Сортавала · база',coords:SORTAVALA}],legs:[{type:'water',points:[SORTAVALA,point('ladoga')]},{type:'land',points:[SORTAVALA,point('ruskeala')]},{type:'water',points:[SORTAVALA,point('valaam')]}]},
 {title:'Центральная Карелия · 3–4 дня',note:'Кижи — водная поездка; Марциальные воды и Кивач — наземная. Гирвас — продолжение при дополнительном дне.',bases:[{name:'Петрозаводск · база',coords:PETROZAVODSK}],legs:[{type:'water',points:[PETROZAVODSK,point('kizhi')]},{type:'land',points:[PETROZAVODSK,point('waters'),point('kivach')]},{type:'optional',points:[point('kivach'),point('girvas')]}]},
 {title:'Север · два отдельных направления',note:'Петроглифы — из Беломорска, Паанаярви — через Пяозерский. Это альтернативные поездки, общей линии между ними нет.',bases:[{name:'Беломорск',coords:BELOMORSK},{name:'Пяозерский',coords:PYA}],legs:[{type:'land',points:[BELOMORSK,point('petroglyphs')]},{type:'optional',points:[PYA,point('paanajarvi')]}]}
];
function drawRoute(){
 if(routeLayer)routeLayer.clearLayers();
 const banner=$('#route-info');banner.hidden=activeRoute===null;
 document.querySelectorAll('.route-show').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.routeIndex)===activeRoute)));
 if(activeRoute===null)return;
 const r=ROUTES[activeRoute];$('#route-name').textContent=r.title;$('#route-note').textContent=r.note;
 if(!routeLayer)return;
 const styles={land:{color:'#365c3c',dashArray:null},water:{color:'#306d94',dashArray:'9 7'},optional:{color:'#aa702a',dashArray:'3 8'}};
 r.legs.forEach(leg=>{
  L.polyline(leg.points,{color:'#fffdf3',weight:8,opacity:.9,interactive:false}).addTo(routeLayer);
  L.polyline(leg.points,{...styles[leg.type],weight:4,opacity:.95,className:'route-line',interactive:false}).addTo(routeLayer);
 });
 r.bases.forEach(base=>L.circleMarker(base.coords,{radius:5,color:'#fffdf3',weight:2,fillColor:'#163c31',fillOpacity:1}).bindTooltip(base.name,{permanent:true,direction:'left',offset:[-9,0],className:'route-base-label'}).addTo(routeLayer));
}
function fit(){if(!map)return;const found=visible();if(found.length)map.fitBounds(L.latLngBounds([...found.map(p=>p.coords),...(activeRoute!==null?ROUTES[activeRoute].bases.map(b=>b.coords):[])]),{padding:[55,75],maxZoom:10,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});}
function reset(){activeRoute=null;category='Все';route=null;$('#search').value='';filterButtons();render();fit();}
function filterButtons(){document.querySelectorAll('[data-category]').forEach(b=>{const on=b.dataset.category===category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function photoCredit(creditId){const c=window.CREDITS?.[creditId];if(!c)return '';return `Фото: ${esc(c.author)} · <a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.license)}</a> · <a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">оригинал</a>. ${esc(c.changes)}`;}
function openPlace(id){
 const p=data.find(p=>p.id===id);if(!p)return;
 selected=id;photoIndex=0;render();
 if(map){map.setView(p.coords,Math.max(map.getZoom(),10),{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});}
 const ll=p.coords.map(n=>n.toFixed(6)).join(', ');
 $('#detail-content').innerHTML=`<section class="gallery" aria-label="Фотографии: ${esc(p.name)}" aria-roledescription="карусель"><div class="gallery-frame"><img class="detail-image" id="gallery-image" src="${p.image}" alt="${esc(p.photoAlt||p.name)}" width="510" height="310" draggable="false"><p id="gallery-error" hidden>Не удалось открыть фотографию. Попробуйте следующую.</p><span class="gallery-badge" id="gallery-count" aria-live="polite"></span><button class="gallery-arrow gallery-prev" type="button" aria-label="Предыдущее фото">‹</button><button class="gallery-arrow gallery-next" type="button" aria-label="Следующее фото">›</button></div><p class="gallery-caption" id="gallery-caption"></p><div class="gallery-thumbs" aria-label="Выбрать фотографию">${(p.photos||[{src:p.image,alt:p.name,creditId:p.id}]).map((photo,i)=>`<button type="button" data-photo="${i}" aria-label="Фото ${i+1}: ${esc(photo.alt)}" aria-pressed="${i===0}"><img src="${photo.src}" alt="" width="92" height="62"></button>`).join('')}</div></section><div class="detail-copy"><p class="eyebrow">${String(p.n).padStart(2,'0')} / ${esc(p.region)} · ${esc(p.category)}</p><h2 id="detail-title">${esc(p.name)}</h2><p class="detail-subtitle">${esc(p.subtitle)}</p><div class="detail-meta"><span>◷ ${esc(p.duration)}</span><span>◌ ${esc(p.season)}</span></div>${p.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}<aside class="fact"><h3>ИНТЕРЕСНЫЙ ФАКТ</h3><p>${esc(p.fact)}</p></aside><section class="practical"><h3>ПЛАНИРУЕМ ПОСЕЩЕНИЕ</h3><p>${esc(p.advice)}</p><p class="price">${esc(p.price)}</p><p class="price-date">${p.tariff?'ЦЕНОВОЙ ОРИЕНТИР · 13.10.2026':'УСЛОВИЯ ПОСЕЩЕНИЯ'}</p><p>${esc(p.priceNote)}</p>${p.tariff?`<a class="text-button" href="${esc(p.tariff)}" target="_blank" rel="noopener noreferrer">Проверить тариф / программу ↗</a>`:''}</section><p class="coords">Точка: ${esc(p.point)}<br>WGS84: ${ll}. Ориентир для знакомства, не геодезическая отметка.</p><a class="external-map" href="https://www.openstreetmap.org/?mlat=${p.coords[0]}&mlon=${p.coords[1]}#map=15/${p.coords[0]}/${p.coords[1]}" target="_blank" rel="noopener noreferrer">Открыть точку в OpenStreetMap <span>↗</span></a><section class="detail-sources"><h3>ИСТОЧНИКИ И ПОДРОБНОСТИ</h3><div class="source-links">${p.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`).join('')}${p.coordinateSource?`<a href="${esc(p.coordinateSource)}" target="_blank" rel="noopener noreferrer">Картографический справочник ↗</a>`:''}</div><a class="source-catalog" href="sources.html#${p.id}">Все источники об этом месте ↗</a></section>${p.coordinateNote?`<p class="coords">${esc(p.coordinateNote)}</p>`:''}<div class="photo-credit">${photoCredit(p.id)}</div></div>`;
 showPhoto(0);
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
 setHash(`#place-${p.id}`);
}
function showPhoto(index){
 const p=data.find(p=>p.id===selected);if(!p)return;
 const photos=p.photos||[{src:p.image,alt:p.photoAlt||p.name,creditId:p.id}];
 photoIndex=(index+photos.length)%photos.length;const photo=photos[photoIndex];
 const img=$('#gallery-image');img.hidden=false;$('#gallery-error').hidden=true;
 img.onerror=()=>{img.hidden=true;$('#gallery-error').hidden=false;};
 img.src=photo.src;img.alt=photo.alt;
 $('#gallery-count').textContent=`${photoIndex+1} / ${photos.length}`;
 $('#gallery-caption').textContent=photo.caption||photo.alt;
 document.querySelectorAll('[data-photo]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===photoIndex)));
 $('.photo-credit').innerHTML=photoCredit(photo.creditId);
}
$('#detail-content').addEventListener('click',e=>{
 const thumb=e.target.closest('[data-photo]');
 if(thumb)showPhoto(Number(thumb.dataset.photo));
 else if(e.target.closest('.gallery-next'))showPhoto(photoIndex+1);
 else if(e.target.closest('.gallery-prev'))showPhoto(photoIndex-1);
});
let touchStart=null;
$('#detail-content').addEventListener('touchstart',e=>{touchStart=e.target.closest('.gallery-frame')&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
$('#detail-content').addEventListener('touchend',e=>{
 if(!touchStart||!e.changedTouches.length)return;
 const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)showPhoto(photoIndex+(dx<0?1:-1));touchStart=null;
},{passive:true});
dialog.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex+(e.key==='ArrowRight'?1:-1));}
});
function close(){dialog.close();setHash('#explore');const b=document.querySelector(`.place-item[data-id="${selected}"]`);b?.focus({preventScroll:true});}
$('#close-detail').addEventListener('click',close);
dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
$('#places').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openPlace(b.dataset.id);});
$('#search').addEventListener('input',()=>{route=null;activeRoute=null;render();fit();});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;route=null;activeRoute=null;filterButtons();render();fit();}));
$('#reset').addEventListener('click',reset);$('#fit').addEventListener('click',fit);
document.querySelectorAll('.route-show').forEach(b=>b.addEventListener('click',()=>{route=b.dataset.route.split(',');activeRoute=Number(b.dataset.routeIndex);category='Все';$('#search').value='';filterButtons();render();fit();$('#explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
function initTiles(){
 let successes=0,failures=0;
 const normal='Нажмите на маркер, чтобы узнать историю места. Группу точек можно приблизить.';
 const warn=()=>{$('#map-status').textContent='Карта загрузилась не полностью. Проверьте интернет или повторите загрузку.';$('#retry-map').hidden=false;};
 base=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19
 });
 base.on('loading',()=>{successes=0;failures=0;clearTimeout(timer);timer=setTimeout(()=>{if(!successes)warn();},12000);});
 base.on('tileload',()=>{successes++;if(!failures){$('#map-status').textContent=normal;$('#retry-map').hidden=true;}});
 base.on('tileerror',()=>{failures++;warn();});
 base.on('load',()=>{clearTimeout(timer);if(failures)warn();});
 $('#retry-map').addEventListener('click',()=>{$('#map-status').textContent='Повторно загружаем карту…';$('#retry-map').hidden=true;base.redraw();});
 base.addTo(map);
}
function initMap(){
 if(!window.L){$('#map').innerHTML='<div class="loading-map">Не удалось загрузить карту.<br>Все места, фотографии и координаты доступны в списке.</div>';$('#map-status').textContent='Карта недоступна. Выберите место в списке.';$('#retry-map').hidden=true;$('#fit').disabled=true;return;}
 $('#map').innerHTML='';
 map=L.map('map',{scrollWheelZoom:false,zoomControl:false,minZoom:4,maxZoom:19}).setView([63.5,32.5],6);L.control.zoom({position:'topright'}).addTo(map);
 const scale=L.control.scale({position:'topright',metric:true,imperial:false,maxWidth:110,updateWhenIdle:false}).addTo(map);
 const localizeScale=()=>{
  const box=scale.getContainer(),line=box.querySelector('.leaflet-control-scale-line');
  if(line){line.textContent=line.textContent.replace(' km',' км').replace(/ m$/,' м');box.setAttribute('aria-label',`Масштаб карты: ${line.textContent}`);}
 };
 scale.getContainer().setAttribute('role','img');map.on('move',localizeScale);localizeScale();
 group=(L.markerClusterGroup?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:38,disableClusteringAtZoom:11,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>L.divIcon({className:'cluster-icon',html:`<span>${cluster.getChildCount()}</span>`,iconSize:[42,42]})}):L.layerGroup()).addTo(map);routeLayer=L.layerGroup().addTo(map);render();fit();initTiles();
 new ResizeObserver(()=>{map.invalidateSize({pan:false});}).observe($('#map'));
}
render();initMap();
const initial=location.hash.replace('#place-','');if(location.hash.startsWith('#place-'))openPlace(initial);
})();
