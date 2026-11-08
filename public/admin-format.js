export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mins=n=>(Number(n||0)/60).toFixed(1);
export function table(headers,rows){return `<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>`<tr>${cells.map((c,i)=>`<td data-label="${esc(headers[i])}">${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">暂无记录</td></tr>`}</tbody></table></div>`;}
export const dateTime=s=>s?esc(String(s).replace('T',' ').replace(/\.\d{3}Z$|Z$/,'')):'暂无记录';
export const rate=v=>!v||v.rate===null?`暂无成熟样本 <small>${v?.pending||0} 人仍在观察</small>`:`${(v.rate*100).toFixed(1)}% <small>${v.returned??v.activated} 人 / ${v.eligible} 位可计算访客；${v.pending} 人仍在观察</small>`;
export const sourceName=s=>({direct:'直接访问 / 未标记来源'}[s]||s||'未标记');
export const languageName=s=>({en:'英语',zh:'中文',vi:'越南语',id:'印尼语','pt-BR':'巴西葡语'}[s]||'未知语言');
export const countrySource=s=>({ip:'IP 推测',user:'用户选择',unknown:'未能推测'}[s]||'旧版未记录来源');
export function sceneName(scene){
 const village=['设置角色','打招呼','点饮品','布置小院','邀请朋友','新手村完成'];
 const market=['茶铺自我介绍','看公告','申请摊位','借桌子','夜市邀请','夜市完成'];
 const [chapter,step]=String(scene||'').split(':');
 if(chapter==='village')return '新手村 · '+(village[step]||'其他步骤');
 if(chapter==='market')return '夜市 · '+(market[step]||{welcome:market[0],notice:market[1],stall:market[2],table:market[3],opening:market[4],complete:market[5]}[step]||'其他步骤');
 return scene?'其他位置（旧版记录）':'暂无位置记录';
}
