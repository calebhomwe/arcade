(() => {
'use strict';
const $=id=>document.getElementById(id), config=window.ARCADE_GODOT_CONFIG, canvas=$('canvas');
const controls={
 'swellrider':[['Carve left','KeyA','a',65],['Pump','KeyW','w',87],['Carve right','KeyD','d',68],['Brake','KeyS','s',83],['Previous board','KeyQ','q',81],['Next board','KeyE','e',69],['Camera','KeyC','c',67]],
 'la-city':[['Steer left','KeyA','a',65],['Accelerate','KeyW','w',87],['Steer right','KeyD','d',68],['Brake / reverse','KeyS','s',83]],
 'claire-big-life':[['Left','KeyA','a',65],['Up','KeyW','w',87],['Down','KeyS','s',83],['Right','KeyD','d',68],['Interact','KeyE','e',69]],
 'heat-firm':[['Water','KeyW','w',87],['Harvest','KeyE','e',69],...Array.from({length:6},(_,i)=>['Plot '+(i+1),'Digit'+(i+1),''+(i+1),49+i])],
 'city-builder':[['Road','Digit1','1',49],['House','Digit2','2',50],['Tree','Digit3','3',51],['Car','Digit4','4',52]],
 'tidebreak-world-tour':[['Left','ArrowLeft','ArrowLeft',37],['Up','ArrowUp','ArrowUp',38],['Down','ArrowDown','ArrowDown',40],['Right','ArrowRight','ArrowRight',39],['Select','Enter','Enter',13],['Back','Escape','Escape',27]],
 'heavens-grace':[['Start','Space',' ',32],['Retry','KeyR','r',82],['Pause','KeyP','p',80]]
};
let ready=false,failed=false;const held=new Map();
function key(def,down){canvas.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:def[2],code:def[1],keyCode:def[3],which:def[3],bubbles:true,cancelable:true}));}
function releaseAll(){for(const [button,def]of held){key(def,false);button.setAttribute('aria-pressed','false');}held.clear();}
function fit(){const r=$('stage').getBoundingClientRect();const scale=Math.min(r.width/canvas.width,r.height/canvas.height);canvas.style.width=Math.floor(canvas.width*scale)+'px';canvas.style.height=Math.floor(canvas.height*scale)+'px';}
addEventListener('resize',fit);addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
$('retry').onclick=()=>location.reload();
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else $('rotate').textContent='Rotate your phone for the widest view.';}catch{$('rotate').textContent='Full screen is unavailable here. Rotate for a wider view.';}};
function fail(message,error){if(failed)return;failed=true;releaseAll();document.body.dataset.boot='failed';$('boot').hidden=false;$('boot-message').textContent=message;$('boot-detail').textContent='Try again, or open the game directly in Safari or Chrome. Your saved progress has not been reset.';$('retry').hidden=false;$('boot-progress').hidden=true;if(error)console.error(error);}
function makeControls(){if(!matchMedia('(pointer: coarse)').matches)return;const defs=controls[document.body.dataset.game]||[];for(const def of defs){const b=document.createElement('button');b.type='button';b.textContent=def[0];b.setAttribute('aria-pressed','false');b.addEventListener('pointerdown',e=>{e.preventDefault();if(!ready)return;canvas.focus();b.setPointerCapture(e.pointerId);held.set(b,def);b.setAttribute('aria-pressed','true');key(def,true);});const up=()=>{if(!held.has(b))return;key(def,false);held.delete(b);b.setAttribute('aria-pressed','false');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);$('touch-controls').appendChild(b);}$('touch-controls').hidden=!defs.length;fit();}
async function boot(){document.body.dataset.boot='loading';fit();const script=document.createElement('script');script.src='../_engine/godot.js';await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Player download timed out')),30000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(new Error('Player download failed'));};document.head.appendChild(script);});
 if(typeof Engine!=='function')throw new Error('Game player did not initialise');
 const missing=Engine.getMissingFeatures({threads:false});if(missing.length){fail('This browser cannot run the game’s graphics.');return;}
 const mobile=matchMedia('(pointer: coarse)').matches;const fps=mobile&&document.body.dataset.game!=='heavens-grace'?'30':'60';const engine=new Engine({...config,canvas,args:[...(config.args||[]),'--max-fps',fps]});$('boot-message').textContent='Downloading game files…';let slow=setTimeout(()=>{if(!ready&&!failed)$('boot-detail').textContent='Large games can take longer on the first launch. Keep this tab open while the download finishes.';},30000);
 try{await engine.startGame({onProgress(current,total){if(failed)return;if(total>0){$('boot-progress').value=current/total*100;$('boot-message').textContent=current>=total?'Preparing the game…':'Downloading game files…';$('boot-detail').textContent=(current/1048576).toFixed(1)+' / '+(total/1048576).toFixed(1)+' MB';}}});if(failed)return;ready=true;document.body.dataset.boot='ready';$('boot').hidden=true;makeControls();fit();canvas.focus();}finally{clearTimeout(slow);}
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics were interrupted. Try reopening the game.');});
boot().catch(error=>fail('The game could not start.',error));
})();
