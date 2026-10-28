/* One install path; each repository owns and verifies its own downloads. */
(() => {
  const root=new URL('../',document.currentScript.src);
  if(!document.getElementById('offline-games')){
    const link=document.createElement('a');link.href=new URL('offline.html',root);link.title='Download games and install on your phone';link.style.minHeight='44px';
    link.innerHTML='<span class="dot"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg></span><span>Offline games</span>';
    const rail=document.getElementById('rail');if(rail)rail.insertBefore(link,rail.querySelector('hr'));
    const chips=document.getElementById('chips');if(chips){const chip=document.createElement('a');chip.href=link.href;chip.className='chip';chip.textContent='Offline games';chip.style.minHeight='44px';chips.prepend(chip);}return;
  }
  const box=document.getElementById('offline-games'),summary=document.getElementById('summary'),search=document.getElementById('game-search');
  const status=document.getElementById('shell-status');const registrations=new Map();let catalog=[];
  const updateButton=document.getElementById('apply-update'),updates=new Set();
  function offerUpdate(reg){updates.add(reg);updateButton.hidden=false;status.textContent='A download update is ready. Finish open games, then tap Update downloads.';}
  updateButton.onclick=async()=>{
    updateButton.disabled=true;
    await Promise.all([...updates].map(reg=>new Promise(resolve=>{
      const worker=reg.waiting;if(!worker){resolve();return;}
      worker.addEventListener('statechange',()=>{if(worker.state==='activated'||worker.state==='redundant')resolve();});
      worker.postMessage({type:'SKIP_WAITING'});setTimeout(resolve,10000);
    })));
    location.reload();
  };
  const communicate=(worker,data,onProgress)=>new Promise((resolve,reject)=>{
    const channel=new MessageChannel();let timer;
    const finish=(error,result)=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve(result);};
    const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(new Error('Download did not finish. Reconnect and retry.')),120000);};arm();
    channel.port1.onmessage=({data:result})=>{
      arm();if(result.type==='OFFLINE_PROGRESS'){onProgress?.(result);return;}
      if(result.type==='error')finish(new Error(result.message));else if(result.type==='status')finish(null,result);
    };
    worker.postMessage(data,[channel.port2]);
  });
  async function registration(repo){
    if(registrations.has(repo))return registrations.get(repo);
    const promise=(async()=>{
      const script=new URL('../'+repo+'/sw.js',root);
      const reg=await navigator.serviceWorker.register(script,{updateViaCache:'none'});
      if(reg.waiting)offerUpdate(reg);
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&reg.waiting)offerUpdate(reg);});});
      if(reg.active)return reg;
      const worker=reg.installing||reg.waiting;
      if(!worker)throw new Error('Offline installation is unavailable. Reconnect and retry.');
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Offline setup timed out. Retry online.')),120000);
        worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(new Error('Offline setup failed. Retry online.'));}});
      });return reg;
    })();
    registrations.set(repo,promise);try{return await promise;}catch(e){registrations.delete(repo);throw e;}
  }
  function render(){
    box.replaceChildren();let shown=0;
    for(const game of catalog.filter(g=>g.supported&&g.title.toLowerCase().includes(search.value.toLowerCase()))){
      shown++;const article=document.createElement('article'),title=document.createElement('h2'),details=document.createElement('p'),state=document.createElement('p'),button=document.createElement('button'),play=document.createElement('a');
      article.dataset.game=game.id;title.textContent=game.title;details.textContent=`${(game.bytes/1e6).toFixed(1)} MB download`;state.className='status';state.role='status';state.setAttribute('aria-live','polite');state.textContent='Download to make this game available offline';
      button.textContent='Download for offline';play.className='play';play.href=new URL('play.html?g='+encodeURIComponent(game.id),root);play.textContent='Play';
      article.append(title,details,state,button,play);box.append(article);
      const display=result=>{state.dataset.ready=String(result.ready);state.textContent=result.ready?'Ready offline':'Download to make this game available offline';button.textContent=result.ready?'Check download':'Download for offline';};
      button.onclick=async()=>{
        button.disabled=true;state.textContent='Preparing download…';
        try{
          const reg=await registration(game.repo);
          if(reg.waiting){offerUpdate(reg);throw new Error('Finish open games, then use Update downloads above.');}
          const result=await communicate(reg.active,{type:'OFFLINE_DOWNLOAD',id:game.id},p=>{state.textContent=`Downloading ${p.completed} / ${p.total} files…`;});display(result);
          if(result.ready)navigator.storage?.persist?.().catch(()=>{});
        }catch(error){state.dataset.ready='false';state.textContent=error.message;button.textContent='Retry download';}finally{button.disabled=false;}
      };
      // Query existing registrations only; browsing the list does not start downloads.
      navigator.serviceWorker.getRegistration(new URL('../'+game.repo+'/',root)).then(reg=>{
        if(reg?.active&&reg.active.scriptURL===new URL('../'+game.repo+'/sw.js',root).href)communicate(reg.active,{type:'OFFLINE_STATUS',id:game.id}).then(display).catch(()=>{});
      }).catch(()=>{});
    }
    summary.textContent=`${shown} downloadable games shown`;
  }
  let installPrompt;const install=document.getElementById('install-app');
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;install.hidden=false;});
  install.onclick=async()=>{await installPrompt?.prompt();install.hidden=true;installPrompt=null;};
  window.addEventListener('appinstalled',()=>{install.hidden=true;});
  if(!('serviceWorker'in navigator)||!window.isSecureContext){status.textContent='Open the HTTPS arcade in Safari or Chrome to download games.';return;}
  fetch(new URL('offline-catalog.json',root)).then(r=>{if(!r.ok)throw Error('Catalogue unavailable');return r.json();}).then(async data=>{
    catalog=data;render();search.addEventListener('input',render);
    const list=document.getElementById('unsupported-games');for(const game of catalog.filter(g=>!g.supported)){const li=document.createElement('li'),a=document.createElement('a');a.textContent=game.title;a.href=new URL('play.html?g='+encodeURIComponent(game.id),root);li.append(a,document.createTextNode(' — '+game.reason));list.append(li);}
    const reg=await registration('arcade');if(reg.waiting){offerUpdate(reg);return;}const result=await communicate(reg.active,{type:'OFFLINE_STATUS'});status.textContent=result.ready?'Catalogue ready offline. Download the games you want below.':'Catalogue download incomplete. Reconnect and reopen this page.';
  }).catch(e=>{status.textContent=e.message;});
})();
