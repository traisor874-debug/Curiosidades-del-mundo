(() => {
  const cfg = window.UMBRAL_CONFIG;
  const hasSupabase = !!(window.supabase && cfg && cfg.url && cfg.key);
  let client = null;
  if (hasSupabase) {
    try { client = window.supabase.createClient(cfg.url, cfg.key); }
    catch (error) { console.error('No se pudo inicializar Supabase:', error); }
  }
  const $ = (selector, scope=document) => scope.querySelector(selector);
  const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
  const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categories = ['Experiencia personal','Paranormal','Ficción','Leyenda urbana','Críptidos','Otro'];
  const showStatus = (element, message, isError=false) => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('error', isError);
    element.setAttribute('role','status');
  };
  const excerpt = (text, max=170) => {
    const value = String(text || '').trim();
    return value.length > max ? value.slice(0,max).trim() + '…' : value;
  };
  const dateText = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-MX',{year:'numeric',month:'short',day:'numeric'});
  };
  function card(story) {
    const title = escapeHTML(story.title || 'Relato sin título');
    const summary = escapeHTML(story.summary || excerpt(story.body));
    const category = escapeHTML(story.category || 'Relato');
    const author = escapeHTML(story.author_name || 'Anónimo');
    return `<article class="story-card"><span class="category">${category}</span><h3><a href="historia.html?id=${encodeURIComponent(story.id)}">${title}</a></h3><p>${summary}</p><div class="meta">${author}${story.created_at ? ' · '+escapeHTML(dateText(story.created_at)) : ''}</div><p><a class="textlink" href="historia.html?id=${encodeURIComponent(story.id)}">Leer relato →</a></p></article>`;
  }
  async function loadStories(target, limit=12, filters={}) {
    if (!target) return;
    if (!client) { target.innerHTML = '<p class="empty">No se pudo iniciar la conexión. Revisa config.js y vuelve a cargar la página.</p>'; return; }
    target.innerHTML = '<p class="empty">Cargando relatos…</p>';
    try {
      let query = client.from('stories').select('id,title,summary,body,category,author_name,created_at,published_at,status').eq('status','published').order('published_at',{ascending:false}).limit(limit);
      if (filters.category) query = query.eq('category',filters.category);
      if (filters.search) {
        const term = filters.search.replace(/[(),.%]/g,' ').replace(/\s+/g,' ').trim();
        if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,body.ilike.%${term}%`);
      }
      const {data,error} = await query;
      if (error) throw error;
      target.innerHTML = data && data.length ? data.map(card).join('') : '<p class="empty">Todavía no hay relatos publicados. ¿Te animas a compartir el primero?</p>';
    } catch (error) {
      console.error('Error al cargar relatos:', error);
      target.innerHTML = '<p class="empty">No pudimos cargar los relatos. Comprueba la conexión con Supabase e inténtalo de nuevo.</p>';
    }
  }
  async function initHome() {
    await loadStories($('#recent-stories'),3);
  }
  async function initStories() {
    const target = $('#stories-list');
    if (!target) return;
    const search = $('#story-search');
    const category = $('#story-category');
    const requestedCategory = new URLSearchParams(location.search).get('categoria');
    if (category && categories.includes(requestedCategory)) category.value = requestedCategory;
    const refresh = () => loadStories(target,60,{search:search?.value.trim() || '',category:category?.value || ''});
    search?.addEventListener('input',refresh);
    category?.addEventListener('change',refresh);
    await refresh();
  }
  async function initStory() {
    const target = $('#story-content');
    if (!target) return;
    if (!client) { target.innerHTML='<p class="empty">No se pudo conectar con el servicio de historias. Inténtalo más tarde.</p>'; return; }
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { target.innerHTML='<p class="empty">No se indicó qué relato abrir. Vuelve a la biblioteca.</p>'; return; }
    try {
      const {data,error}=await client.from('stories').select('title,body,category,author_name,created_at,published_at,status').eq('id',id).eq('status','published').single();
      if(error) throw error;
      document.title = `${data.title} | D’Asombro`;
      target.innerHTML=`<article class="story-scene"><div class="story-masthead"><p class="eyebrow">ARCHIVO D’ASOMBRO · ${escapeHTML(data.category)}</p><h1>${escapeHTML(data.title)}</h1><div class="story-byline"><span>Por ${escapeHTML(data.author_name || "Anónimo")}</span><span>${escapeHTML(dateText(data.published_at || data.created_at))}</span><span>Lectura</span></div></div><section class="reading-panel"><div class="bodytext">${escapeHTML(data.body)}</div></section><div class="story-end"><a class="textlink" href="historias.html">← Volver a la biblioteca</a><span class="meta">Cada historia deja algo detrás.</span></div></article>`;
    } catch(e) {
      console.error(e);
      target.innerHTML='<p class="empty">No encontramos ese relato publicado. Puede que el enlace sea incorrecto o que el relato ya no esté disponible.</p>';
    }
  }
  async function initSubmit() {
    const form = $('#story-form');
    if (!form) return;
    const status = $('#form-status');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!client) { showStatus(status,'No se pudo conectar con Supabase. Revisa config.js.',true); return; }
      const fd = new FormData(form);
      const title = String(fd.get('title') || '').trim();
      const body = String(fd.get('body') || '').trim();
      const author = String(fd.get('author_name') || '').trim() || 'Anónimo';
      const summary = String(fd.get('summary') || '').trim();
      const category = String(fd.get('category') || 'Experiencia personal');
      const consent = fd.get('consent') === 'on';
      if (title.length < 5 || title.length > 120) { showStatus(status,'El título debe tener entre 5 y 120 caracteres.',true); return; }
      if (body.length < 80 || body.length > 20000) { showStatus(status,'El relato debe tener entre 80 y 20,000 caracteres.',true); return; }
      if (summary.length > 280) { showStatus(status,'El resumen no puede superar 280 caracteres.',true); return; }
      if (!categories.includes(category)) { showStatus(status,'Selecciona una categoría válida.',true); return; }
      if (!consent) { showStatus(status,'Debes aceptar las normas y confirmar que puedes compartir este relato.',true); return; }
      const button = $('button[type="submit"]',form);
      if(button) button.disabled=true;
      showStatus(status,'Enviando tu relato…');
      try {
        // getSession reads the existing local session without an extra auth network request.
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError) throw sessionError;
        const payload = {title,body,author_name:author,summary:summary || null,category,consent:true,status:'pending',author_id:sessionData?.session?.user?.id || null};
        const {error}=await client.from('stories').insert(payload);
        if(error) throw error;
        form.reset();
        showStatus(status,'¡Relato enviado! Quedó pendiente de revisión antes de publicarse.');
      } catch(e) {
        console.error(e);
        showStatus(status,'No se pudo enviar. Revisa la configuración y las políticas de Supabase. Detalle: '+(e.message || 'error desconocido'),true);
      } finally { if(button) button.disabled=false; }
    });
  }
  async function initAccount() {
    const loginForm=$('#login-form'), signupForm=$('#signup-form'), logout=$('#logout-button'), status=$('#account-status'), signed=$('#signed-in');
    const dashboard=$('#account-dashboard'), authForms=$('#auth-forms'), profileForm=$('#profile-form'), storiesTarget=$('#my-stories');
    if (!loginForm && !signupForm && !logout) return;
    if(!client){showStatus(status,'No se pudo iniciar Supabase. Revisa config.js.',true);return;}
    const avatars={portrait1:'photo-1500648767791-00dcc994a43e',portrait2:'photo-1534528741775-53994a69daeb',portrait3:'photo-1506794778202-cad84cf45f1d',portrait4:'photo-1531123897727-8f129e1688ce',portrait5:'photo-1507003211169-0a1dd7228f2d',portrait6:'photo-1524504388940-b1c1722653e1',portrait7:'photo-1504593811423-6dd665756598',portrait8:'photo-1535713875002-d1d0cf377fde'};
    let ownStories=[];
    let activeFilter='all';
    function renderOwnStories(){
      const rows=ownStories.filter(s=>activeFilter==='all'||s.status===activeFilter);
      if(!storiesTarget)return;
      if(!rows.length){storiesTarget.innerHTML='<div class="empty account-empty">No hay relatos en esta categoría todavía. <a href="enviar.html">Comparte tu primera historia →</a></div>';return;}
      storiesTarget.innerHTML=rows.map(s=>{
        const labels={pending:'En revisión',changes:'Necesita correcciones',published:'Publicado',rejected:'No aceptado'};
        const notes=s.moderation_note?'<p class="moderation-note">'+escapeHTML(s.moderation_note)+'</p>':'';
        return '<article class="my-story"><div class="my-story-top"><span class="story-state state-'+escapeHTML(s.status)+'">'+(labels[s.status]||escapeHTML(s.status))+'</span><span class="meta">'+escapeHTML(dateText(s.created_at))+'</span></div><h3>'+escapeHTML(s.title)+'</h3><p class="meta">'+escapeHTML(s.category)+'</p>'+notes+(s.status==='published'?'<a class="textlink" href="historia.html?id='+encodeURIComponent(s.id)+'">Ver publicado →</a>':'')+'</article>';
      }).join('');
    }
    async function loadOwnStories(user){
      if(!storiesTarget)return;
      storiesTarget.innerHTML='<p class="empty">Buscando tus relatos…</p>';
      try{
        const {data,error}=await client.from('stories').select('id,title,category,status,created_at,moderation_note').eq('author_id',user.id).order('created_at',{ascending:false}).limit(100);
        if(error)throw error;
        ownStories=data||[];
        const count=key=>ownStories.filter(s=>s.status===key).length;
        $('#story-total').textContent=String(ownStories.length);
        $('#count-pending').textContent=String(count('pending'));
        $('#count-changes').textContent=String(count('changes'));
        $('#count-published').textContent=String(count('published'));
        $('#count-rejected').textContent=String(count('rejected'));
        renderOwnStories();
      }catch(error){
        console.error('No se pudieron cargar los relatos de la cuenta:',error);
        storiesTarget.innerHTML='<p class="empty">No se pudieron consultar tus relatos. Es posible que falte una política de lectura para que cada usuario vea únicamente sus propios envíos. Tus relatos no se han modificado.</p>';
      }
    }
    function setProfile(user){
      const meta=user.user_metadata||{};
      const name=meta.display_name||meta.full_name||meta.name||user.email?.split('@')[0]||'Autor';
      const avatar=avatars[meta.avatar_id]||avatars.portrait1;
      $('#profile-display-name').textContent=name;
      $('#profile-email').textContent=user.email||'';
      $('#profile-name').value=meta.display_name||'';
      $('#profile-avatar-preview').innerHTML='<img src="https://images.unsplash.com/'+avatar+'?auto=format&fit=crop&w=240&h=240&q=90" alt="">';
      $$('input[name="avatar"]').forEach(input=>{input.checked=input.value.trim()===meta.avatar_id;});
    }
    async function refresh(){
      try{
        const {data,error}=await client.auth.getSession();
        if(error)throw error;
        const user=data?.session?.user||null;
        if(signed)signed.textContent=user?'Sesión iniciada':'No has iniciado sesión.';
        dashboard?.classList.toggle('hidden',!user);
        authForms?.classList.toggle('hidden',!!user);
        if(user){
          setProfile(user);
          await loadOwnStories(user);
        }
        return user;
      }catch(error){
        console.error(error);
        if(signed)signed.textContent='No se pudo comprobar tu sesión.';
        showStatus(status,error.message||'No se pudo comprobar la sesión.',true);
        return null;
      }
    }
    profileForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const name=$('#profile-name').value.trim();
      const avatar=document.querySelector('input[name="avatar"]:checked')?.value.trim();
      if(name.length<3||name.length>24){showStatus(status,'El nombre debe tener entre 3 y 24 caracteres.',true);return;}
      if(!avatar||!avatars[avatar]){showStatus(status,'Elige uno de los avatares disponibles.',true);return;}
      const button=$('button[type="submit"]',profileForm);if(button)button.disabled=true;
      try{
        const {data,error}=await client.auth.updateUser({data:{display_name:name,avatar_id:avatar}});
        if(error)throw error;
        if(data?.user)setProfile(data.user);
        showStatus(status,'Tu perfil se guardó correctamente.');
      }catch(error){showStatus(status,error.message||'No se pudo guardar el perfil.',true);}
      finally{if(button)button.disabled=false;}
    });
    $$('[data-account-filter]').forEach(button=>button.addEventListener('click',()=>{
      activeFilter=button.dataset.accountFilter;
      $$('[data-account-filter]').forEach(item=>item.classList.toggle('active',item===button));
      renderOwnStories();
    }));
    loginForm?.addEventListener('submit',async e=>{
      e.preventDefault();const button=$('button[type="submit"]',loginForm);if(button)button.disabled=true;
      try{const fd=new FormData(loginForm);const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error)throw error;showStatus(status,'Sesión iniciada correctamente.');await refresh();}
      catch(error){showStatus(status,error.message||'No se pudo iniciar sesión.',true);}finally{if(button)button.disabled=false;}
    });
    signupForm?.addEventListener('submit',async e=>{
      e.preventDefault();const button=$('button[type="submit"]',signupForm);if(button)button.disabled=true;
      try{const fd=new FormData(signupForm);const {data,error}=await client.auth.signUp({email:fd.get('email'),password:fd.get('password'),options:{data:{display_name:'',avatar_id:'portrait1'}}});if(error)throw error;showStatus(status,data?.session?'Cuenta creada. Completa tu perfil.':'Cuenta creada. Revisa tu correo si Supabase solicita confirmación.');if(data?.session)await refresh();}
      catch(error){showStatus(status,error.message||'No se pudo crear la cuenta.',true);}finally{if(button)button.disabled=false;}
    });
    logout?.addEventListener('click',async()=>{
      try{const {error}=await client.auth.signOut();if(error)throw error;showStatus(status,'Sesión cerrada.');await refresh();}
      catch(error){showStatus(status,error.message||'No se pudo cerrar la sesión.',true);}
    });
    await refresh();
  }
  async function initAdmin() {
    const target=$('#admin-stories'), status=$('#admin-status'), login=$('#admin-login');
    if(!target && !login) return;
    if(!client){showStatus(status,'No se pudo iniciar Supabase. Revisa config.js.',true);return;}
    async function refresh(){
      try {
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError) throw sessionError;
        const user=sessionData?.session?.user || null;
        if(!user){target && (target.innerHTML='<p class="empty">Inicia sesión en Mi cuenta con una cuenta autorizada como administradora.</p>');return;}
        const {data:admin,error:adminError}=await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
        if(adminError) throw adminError;
        if(!admin){target && (target.innerHTML='<p class="empty">Esta cuenta no tiene permisos de administración.</p>');return;}
        const {data,error}=await client.from('stories').select('id,title,author_name,category,status,created_at').order('created_at',{ascending:false}).limit(100);
        if(error) throw error;
        target.innerHTML=(data||[]).map(s=>`<div class="item"><p class="meta">${escapeHTML(s.status)} · ${escapeHTML(s.category)} · ${escapeHTML(s.author_name)}</p><h3>${escapeHTML(s.title)}</h3><div class="actions-row">${['published','changes','rejected'].map(st=>`<button data-id="${escapeHTML(s.id)}" data-status="${st}">${st==='published'?'Publicar':st==='changes'?'Solicitar cambios':'Rechazar'}</button>`).join('')}</div></div>`).join('') || '<p class="empty">No hay relatos enviados.</p>';
        $$('button[data-id]',target).forEach(btn=>btn.addEventListener('click',async()=>{
          btn.disabled=true;
          try {
            const nextStatus=btn.dataset.status;
            const {error}=await client.from('stories').update({status:nextStatus,published_at:nextStatus==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',btn.dataset.id);
            if(error) throw error;
            showStatus(status,'Estado actualizado.');
            await refresh();
          } catch(error) { showStatus(status,'No se pudo actualizar: '+(error.message || 'error desconocido'),true); btn.disabled=false; }
        }));
      } catch(error) {
        console.error('Error en el panel de administración:',error);
        if(target) target.innerHTML='<p class="empty">No se pudo cargar el panel. Comprueba la sesión, la tabla admin_users y las políticas de acceso en Supabase.</p>';
        showStatus(status,error.message || 'Error al comprobar permisos.',true);
      }
    }
    login?.addEventListener('click',async()=>{
      try {
        const {data,error}=await client.auth.getSession();
        if(error) throw error;
        if(!data?.session?.user){showStatus(status,'Primero inicia sesión en Mi cuenta.',true);return;}
        await refresh();
      } catch(error) { showStatus(status,error.message || 'No se pudo comprobar la sesión.',true); }
    });
    await refresh();
  }
  async function initVideos(){
    const videos=$('#video-list');
    if(!videos)return;
    const ids=$$(' [data-youtube-id]',videos);
    ids.forEach(el=>{const id=el.dataset.youtubeId;if(/^[A-Za-z0-9_-]{11}$/.test(id)){el.innerHTML=`<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${id}" title="Video de terror de YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;}});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    initHome();initStories();initStory();initSubmit();initAccount();initAdmin();initVideos();
  });
})();