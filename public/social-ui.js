const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy={
 find:['去找其他玩家','Find other players','Tìm người chơi khác','Cari pemain lain','Encontrar jogadores'],
 publish:['公开我的作品','Share my work publicly','Chia sẻ tác phẩm công khai','Bagikan karya saya','Publicar minha criação'],
 join:['自愿加入玩家列表，让其他玩家通过昵称找到我','Join the player list so others can find my nickname','Tham gia danh sách để người khác tìm tôi bằng biệt danh','Bergabung ke daftar agar pemain lain menemukan nama saya','Entrar na lista para outros encontrarem meu apelido'],
 publicName:['公开昵称','Public nickname','Biệt danh công khai','Nama panggilan publik','Apelido público'],
 consentHint:['默认不加入。加入后昵称和独立玩家编号会向其他玩家展示，无需公开作品；可以随时取消。不要填写联系方式。','Off by default. Joining shows your nickname and a separate player code to other players; no published work needed. Leave anytime. Do not include contact details.','Mặc định không tham gia. Biệt danh và mã người chơi riêng sẽ hiển thị; không cần tác phẩm công khai. Có thể rời bất cứ lúc nào. Không ghi thông tin liên hệ.','Nonaktif secara bawaan. Nama dan kode pemain terpisah akan ditampilkan; karya publik tidak diperlukan. Bisa keluar kapan saja. Jangan isi kontak pribadi.','Desativado por padrão. Mostra seu apelido e um código de jogador separado; não exige criação pública. Saia quando quiser. Não inclua contatos.'],
 hidden:['尚未加入玩家列表，也没有公开作品；别人暂时无法发现你。','You have not joined the player list or published a work. Other players cannot discover you yet.','Bạn chưa tham gia danh sách hoặc công khai tác phẩm. Người khác chưa thể tìm thấy bạn.','Anda belum bergabung ke daftar atau menerbitkan karya. Pemain lain belum dapat menemukan Anda.','Você ainda não entrou na lista nem publicou uma criação. Outros ainda não podem encontrar você.'],
 listed:['你已加入玩家列表，别人可以通过昵称找到你。','You are on the player list. Others can find you by nickname.','Bạn đã có trong danh sách. Người khác có thể tìm bằng biệt danh.','Anda ada di daftar pemain. Orang lain dapat mencari nama Anda.','Você está na lista. Outros podem encontrar seu apelido.'],
 viaWork:['你已公开作品，别人可以从作品给你发问候；你尚未加入玩家列表。','Others can greet you through your published work. You have not joined the player list.','Người khác có thể chào qua tác phẩm công khai. Bạn chưa tham gia danh sách.','Orang lain dapat menyapa melalui karya publik. Anda belum bergabung ke daftar.','Outros podem saudar você pela criação pública. Você ainda não entrou na lista.'],
 off:['问候接收已关闭。别人暂时不能向你发送新的问候。','Receiving greetings is off. Others cannot send you new greetings.','Đã tắt nhận lời chào. Người khác không thể gửi lời chào mới.','Penerimaan sapaan nonaktif. Pemain lain tidak dapat mengirim sapaan baru.','O recebimento está desativado. Outros não podem enviar novas saudações.'],
 workHint:['作品仍需先保存，再提交审核；审核发布后才会公开。','Save a work, then submit it for review. It becomes public only after review and publication.','Lưu tác phẩm rồi gửi duyệt. Chỉ công khai sau khi duyệt và xuất bản.','Simpan karya lalu ajukan peninjauan. Karya menjadi publik setelah disetujui dan diterbitkan.','Salve a criação e envie para revisão. Ela só fica pública após revisão e publicação.'],
 players:['玩家列表','Player list','Danh sách người chơi','Daftar pemain','Lista de jogadores'],
 search:['按昵称查找','Search by nickname','Tìm theo biệt danh','Cari nama panggilan','Buscar por apelido'],
 searchButton:['查找 / 刷新','Search / refresh','Tìm / làm mới','Cari / perbarui','Buscar / atualizar'],
 directoryHint:['这里只展示自愿加入且开启接收问候的其他玩家，不表示在线状态。无需加入列表，也可以给他们发送预设中文问候。','Only other players who opted into discovery and greetings appear here. This is not an online status. You can send preset Chinese greetings without joining.','Chỉ hiển thị người đã tự nguyện tham gia và bật nhận lời chào, không phải trạng thái trực tuyến. Bạn có thể chào mà không tham gia.','Hanya pemain yang memilih bergabung dan menerima sapaan ditampilkan. Ini bukan status daring. Anda dapat menyapa tanpa bergabung.','Só aparecem outros jogadores que aceitaram a lista e as saudações. Não indica quem está online. Você pode saudar sem entrar.'],
 noPlayers:['还没有符合条件的玩家。可以清空昵称重新查找，或自愿加入列表，让下一位玩家找到你。','No matching players yet. Clear the nickname to try again, or join voluntarily so the next player can find you.','Chưa có người phù hợp. Xóa biệt danh để thử lại, hoặc tự nguyện tham gia để người sau tìm thấy bạn.','Belum ada pemain yang cocok. Kosongkan nama untuk mencoba lagi, atau bergabung agar pemain berikutnya menemukan Anda.','Nenhum jogador encontrado. Limpe o apelido e tente novamente, ou entre voluntariamente para o próximo jogador encontrar você.'],
 loadError:['玩家列表加载失败，请点“查找 / 刷新”重试。','Could not load players. Select Search / refresh to retry.','Không tải được danh sách. Nhấn Tìm / làm mới để thử lại.','Daftar gagal dimuat. Pilih Cari / perbarui untuk mencoba lagi.','Não foi possível carregar. Use Buscar / atualizar para tentar novamente.'],
 loading:['正在加载玩家列表……','Loading players…','Đang tải người chơi…','Memuat pemain…','Carregando jogadores…'],
 playerCode:['玩家编号','Player code','Mã người chơi','Kode pemain','Código de jogador'],
 limit:['最多显示 50 位；可输入昵称缩小范围。','Up to 50 players shown; search a nickname to narrow the list.','Hiển thị tối đa 50 người; tìm biệt danh để thu hẹp.','Maksimal 50 pemain; cari nama untuk mempersempit daftar.','Até 50 jogadores; busque um apelido para reduzir a lista.'],
 refresh:['刷新问候','Refresh greetings','Làm mới lời chào','Perbarui sapaan','Atualizar saudações'],
 title:['玩家问候','Player greetings','Lời chào từ người chơi','Sapaan pemain','Saudações de jogadores'],
 greet:['向这位玩家打招呼','Greet this player','Chào người chơi này','Sapa pemain ini','Cumprimente este jogador'],
 hint:['这是给真实玩家的问候，不是游戏角色。仅收件人看到你的称呼和预设问候；同一人每天最多一次。','This goes to a real player, not a story character. Only the recipient sees your name and preset greeting. Once per player per day.','Gửi đến người chơi thật, không phải nhân vật. Chỉ người nhận thấy tên và lời chào có sẵn. Mỗi người một lần mỗi ngày.','Dikirim ke pemain sungguhan, bukan karakter cerita. Hanya penerima melihat nama dan sapaan pilihanmu. Sekali per pemain per hari.','Enviado a um jogador real, não a um personagem. Só o destinatário vê seu nome e a saudação pronta. Uma vez por jogador por dia.'],
 name:['对方看到的称呼','Name shown to this player','Tên hiển thị cho người nhận','Nama yang dilihat penerima','Nome mostrado ao destinatário'],
 choose:['选一句中文','Choose a Chinese greeting','Chọn lời chào tiếng Trung','Pilih sapaan Mandarin','Escolha uma saudação em chinês'],
 hello:['你好','Hello','Xin chào','Halo','Olá'],welcome:['欢迎来玩','Welcome to visit','Chào mừng bạn ghé thăm','Selamat berkunjung','Boas-vindas à visita'],thanks:['谢谢','Thank you','Cảm ơn','Terima kasih','Obrigado(a)'],
 send:['发送问候','Send greeting','Gửi lời chào','Kirim sapaan','Enviar saudação'],
 enabled:['接收其他玩家的问候','Receive greetings from other players','Nhận lời chào từ người chơi khác','Terima sapaan pemain lain','Receber saudações de outros jogadores'],
 settingsHint:['默认关闭。开启后，可通过已审核公开的作品接收问候；也可以另外自愿加入下方的玩家列表，无需公开作品。回礼不需要加入列表，不开启私信聊天。','Off by default. Receive greetings through reviewed public work, or separately opt into the player list below without publishing a work. Replying does not require joining. No free-form chat.','Mặc định tắt. Nhận lời chào qua tác phẩm công khai đã duyệt hoặc tự nguyện tham gia danh sách bên dưới mà không cần công khai tác phẩm. Trả lời không cần tham gia. Không trò chuyện tự do.','Nonaktif secara bawaan. Terima sapaan lewat karya publik yang disetujui, atau pilih bergabung ke daftar di bawah tanpa menerbitkan karya. Membalas tidak perlu bergabung. Tidak ada obrolan bebas.','Desativado por padrão. Receba saudações por criações públicas aprovadas ou entre separadamente na lista abaixo sem publicar. Responder não exige entrar. Sem bate-papo livre.'],
 save:['保存设置','Save settings','Lưu cài đặt','Simpan pengaturan','Salvar configurações'],
 received:['收到的问候','Received','Đã nhận','Diterima','Recebidas'],sent:['发出的问候','Sent','Đã gửi','Terkirim','Enviadas'],
 empty:['还没有问候。可以点“去找其他玩家”，也可以参观公开作品。','No greetings yet. Find other players or visit public creations.','Chưa có lời chào. Hãy tìm người chơi khác hoặc ghé thăm tác phẩm công khai.','Belum ada sapaan. Cari pemain lain atau kunjungi karya publik.','Ainda não há saudações. Encontre jogadores ou visite criações públicas.'],
 reply:['回礼','Reply','Đáp lại','Balas','Responder'],replied:['已回礼','Replied','Đã đáp lại','Sudah dibalas','Respondido'],
 block:['屏蔽这位玩家','Block this player','Chặn người chơi','Blokir pemain ini','Bloquear este jogador'],
 blocked:['已屏蔽的玩家','Blocked players','Người chơi bị chặn','Pemain diblokir','Jogadores bloqueados'],unblock:['取消屏蔽','Unblock','Bỏ chặn','Buka blokir','Desbloquear'],
 done:['已发送。你可以继续学习，稍后来这里看回礼。','Sent. Keep learning and check here later for a reply.','Đã gửi. Tiếp tục học và quay lại xem lời đáp.','Terkirim. Lanjut belajar dan kembali nanti untuk melihat balasan.','Enviado. Continue aprendendo e volte depois para ver a resposta.'],
 error:['操作未完成，输入已保留，请重试。','Could not complete. Your input is kept; please retry.','Chưa hoàn tất. Nội dung được giữ lại; hãy thử lại.','Gagal. Isian disimpan; coba lagi.','Não foi possível concluir. Seus dados foram mantidos; tente novamente.'],
 rate:['今天已经打过招呼，或已达到每天 10 次的上限。','Already greeted this player today, or reached 10 greetings today.','Đã chào người này hôm nay hoặc đạt giới hạn 10 lời chào.','Sudah menyapa pemain ini hari ini, atau mencapai batas 10 sapaan.','Você já cumprimentou este jogador hoje ou atingiu 10 saudações hoje.'],
 unavailable:['这位玩家暂时无法接收问候。','This player cannot receive greetings right now.','Người chơi này hiện không nhận lời chào.','Pemain ini belum bisa menerima sapaan.','Este jogador não pode receber saudações agora.']
};
const text=(key,lang)=>copy[key]?.[({zh:0,en:1,vi:2,id:3,'pt-BR':4})[lang]??1]??key;
const phrases={hello:['你好','Nǐ hǎo'],welcome:['欢迎来玩','Huānyíng lái wán'],thanks:['谢谢','Xièxie']};
const phrase=(id,lang)=>phrases[id]?`${phrases[id][0]} · ${phrases[id][1]} · ${text(id,lang)}`:'';
export function greetingHTML(work,{language,name='',own=false,player=false}){
 if(own||!work.greetingsEnabled)return '';
 const S=k=>text(k,language);
 return `<details class="greeting-entry"><summary>${S('greet')}</summary><form data-greeting="${esc(work.id)}" ${player?`data-player-id="${esc(work.id)}"`:''}><p>${S('hint')}</p><label>${S('name')}<input name="name" maxlength="24" required value="${esc(name)}" autocomplete="off"></label><label>${S('choose')}<select name="phrase">${Object.keys(phrases).map(id=>`<option value="${id}">${phrase(id,language)}</option>`).join('')}</select></label><button class="primary">${S('send')}</button><p role="status" data-social-status></p></form></details>`;
}
export function discoveryHTML(inbox,language){
 const S=k=>text(k,language),status=!inbox.enabled?'off':inbox.directory?.listed?'listed':inbox.publicWorks?'viaWork':'hidden';
 return `<p class="discovery-status" role="status">${S(status)}</p><div class="actions"><button type="button" data-find-players>${S('find')}</button><button type="button" data-publish-work>${S('publish')}</button></div><p class="muted">${S('workHint')}</p>`;
}
export function socialHTML(inbox,language,{available=true,name=''}={}){
 if(!available)return "";
 const S=k=>text(k,language),list=(items,received)=>items.length?items.map(g=>`<article class="greeting-item"><p><strong>${esc(received?g.name:(g.recipientName||g.workName))}</strong></p><p lang="zh-CN">${phrase(g.phrase,language)}</p>${g.reply?`<p>${S('replied')}：${phrase(g.reply,language)}</p>`:received?`<div class="actions">${['hello','thanks'].map(id=>`<button type="button" data-reply="${esc(g.id)}" data-phrase="${id}">${S('reply')} · ${phrase(id,language)}</button>`).join('')}</div>`:''}${received?`<button type="button" data-block="${esc(g.id)}">${S('block')}</button>`:''}</article>`).join(''):`<p>${S('empty')}</p>`;
 return `<section class="paper social-panel"><h2>${S('title')}</h2><button type="button" data-refresh-greetings>${S('refresh')}</button><p>${S('settingsHint')}</p>${discoveryHTML(inbox,language)}<form data-social-settings><label class="consent"><input type="checkbox" name="enabled" ${inbox.enabled?'checked':''}>${S('enabled')}</label><label class="consent"><input type="checkbox" name="listed" ${inbox.directory?.listed?'checked':''} ${!inbox.enabled?'disabled':''}>${S('join')}</label><p class="muted">${S('consentHint')}</p><label>${S('publicName')}<input name="displayName" maxlength="24" value="${esc(inbox.directory?.displayName||name)}" ${inbox.directory?.listed?'required':'disabled'} autocomplete="off"></label><button>${S('save')}</button></form><p role="status" data-inbox-status></p><h3>${S('received')}</h3>${list(inbox.received||[],true)}<details><summary>${S('sent')} (${inbox.sent?.length||0})</summary>${list(inbox.sent||[],false)}</details>${inbox.blocked?.length?`<details><summary>${S('blocked')}</summary>${inbox.blocked.map(g=>`<p>${esc(g.name)} <button type="button" data-unblock="${esc(g.id)}">${S('unblock')}</button></p>`).join('')}</details>`:''}</section>`;
}
export function playerDirectoryHTML(directory,language,{name='',query=''}={}){
 const S=k=>text(k,language),ready=directory.status==='ready';
 return `<section class="paper player-directory" id="player-directory" tabindex="-1"><h2>${S('players')}</h2><p>${S('directoryHint')}</p><form data-player-search><label>${S('search')}<input name="query" maxlength="24" value="${esc(query)}" autocomplete="off"></label><button>${S('searchButton')}</button></form>${ready?`<p class="muted">${directory.players.length} / ${directory.total} · ${S('limit')}</p><div class="player-cards">${directory.players.length?directory.players.map(p=>`<article class="player-card"><h3>${esc(p.name)}</h3><small>${S('playerCode')} · ${esc(p.id.slice(-8))}</small>${greetingHTML({...p,greetingsEnabled:true},{language,name,player:true})}</article>`).join(''):`<p>${S('noPlayers')}</p>`}</div>`:`<p role="status">${S(directory.status==='error'?'loadError':'loading')}</p>`}</section>`;
}
export function createPlayerSearch(api){
 let generation=0,state={players:[],total:0,status:'idle',query:''};
 return {get state(){return state;},async load(query=state.query){
  const current=++generation;state={players:[],total:0,status:'loading',query};
  try{const result=await api('social/players?q='+encodeURIComponent(query));if(current===generation)state={...result,status:'ready',query};}
  catch{if(current===generation)state={players:[],total:0,status:'error',query};}
 }};
}
export function bindSocial(root,{language,drafts,api,refresh,onEvent=()=>{},findPlayers=()=>{},publishWork=()=>{},searchPlayers=()=>{}}){
 const error=e=>text(e.message==='rate_limited'?'rate':e.message==='unavailable'?'unavailable':'error',language);
 for(const form of root.querySelectorAll('[data-greeting]')){
  const key=form.dataset.greeting;
  if(!drafts.has(key))drafts.set(key,{name:form.elements.name.value,phrase:'hello',id:null,sent:false,pending:false});
  const draft=drafts.get(key),status=form.querySelector('[data-social-status]'),button=form.querySelector('button');
  const update=()=>{form.elements.name.value=draft.name;form.elements.phrase.value=draft.phrase;button.disabled=form.elements.name.disabled=form.elements.phrase.disabled=draft.sent||draft.pending;if(draft.sent)status.textContent=text('done',language);};
  for(const field of ['name','phrase'])form.elements[field].oninput=()=>{draft[field]=form.elements[field].value;draft.id=null;};
  form.onsubmit=async e=>{e.preventDefault();if(draft.sent||draft.pending)return;draft.id??=crypto.randomUUID();draft.pending=true;update();try{await api('social/send','POST',{id:draft.id,...(form.dataset.playerId?{playerId:form.dataset.playerId}:{workId:key}),name:draft.name,phrase:draft.phrase});draft.sent=true;onEvent('greeting_send');}catch(e){status.textContent=error(e);}finally{draft.pending=false;update();}};
  update();
 }
 const settings=root.querySelector('[data-social-settings]'),status=root.querySelector('[data-inbox-status]');
 let pending=false;
 const act=async(path,body,event)=>{if(pending)return;pending=true;const buttons=[...root.querySelectorAll('.social-panel button')];buttons.forEach(b=>b.disabled=true);try{await api(path,'POST',body);onEvent(event);await refresh();}catch(e){status.textContent=error(e);}finally{pending=false;buttons.forEach(b=>b.disabled=false);}};
 const refreshButton=root.querySelector('[data-refresh-greetings]');
 if(refreshButton)refreshButton.onclick=async()=>{if(pending)return;pending=true;refreshButton.disabled=true;try{await refresh();}catch(e){status.textContent=error(e);}finally{pending=false;refreshButton.disabled=false;}};
 if(settings){
  const fields=settings.elements;
  const update=()=>{if(!fields.listed)return;if(!fields.enabled.checked)fields.listed.checked=false;fields.listed.disabled=!fields.enabled.checked;fields.displayName.disabled=!fields.listed.checked;fields.displayName.required=fields.listed.checked;};
  fields.enabled.onchange=update;if(fields.listed)fields.listed.onchange=update;update();
  settings.onsubmit=e=>{e.preventDefault();void act('social/settings',{enabled:fields.enabled.checked,...(fields.listed?{listed:fields.listed.checked,displayName:fields.displayName.value}:{})},'greeting_settings');};
 }
 const find=root.querySelector('[data-find-players]'),publish=root.querySelector('[data-publish-work]'),search=root.querySelector('[data-player-search]');
 if(find)find.onclick=findPlayers;if(publish)publish.onclick=publishWork;
 if(search)search.onsubmit=e=>{e.preventDefault();return searchPlayers(search.elements.query.value);};
 for(const button of root.querySelectorAll('[data-reply]'))button.onclick=()=>act('social/reply',{id:button.dataset.reply,phrase:button.dataset.phrase},'greeting_reply');
 for(const button of root.querySelectorAll('[data-block]'))button.onclick=()=>act('social/block',{id:button.dataset.block},'greeting_block');
 for(const button of root.querySelectorAll('[data-unblock]'))button.onclick=()=>act('social/block',{id:button.dataset.unblock,blocked:false},'greeting_unblock');
}
