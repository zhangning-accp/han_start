export const VERSION = '0.4.8';
export const residents = [
  {name:'林小满', role:'茶铺主人', icon:'茶', color:'#b66b49', bio:'喜欢把新朋友介绍给整条街。今晚想在夜市分享桂花茶。'},
  {name:'陈安', role:'广场管理员', icon:'安', color:'#688476', bio:'负责场地和公告。入口要留给来往的人，摊位安排在广场两侧。'},
  {name:'阿禾', role:'修理铺邻居', icon:'禾', color:'#b39855', bio:'愿意借出桌子，但今天下午还要修理桌腿。说清时间，就能互相帮忙。'}
];
export const tasks = [
 {id:'welcome',title:'初到小镇',place:'小满茶铺',npc:0,goal:'用中文介绍自己的称呼',line:'你好，我叫小满，欢迎来到青禾街！你叫什么名字？今晚我们要一起准备夜市。',en:'Welcome! What should I call you? We are preparing a night market.',hint:'我叫…… / 你可以叫我……',pinyin:'Wǒ jiào… / Nǐ kěyǐ jiào wǒ…',example:'我叫小雨。',success:'很高兴认识你！这是青禾街的地图。先去广场看看陈安的公告吧。',reward:'获得青禾街地图'},
 {id:'notice',title:'看懂公告',place:'公共广场',npc:1,goal:'确认日期、时间和地点',line:'【夜市公告】星期六晚上七点，公共广场见。请告诉我：夜市什么时候、在哪里举行？',en:'Read the notice and confirm the day, time and location.',hint:'星期……晚上……点，在……。三个信息都要确认。',pinyin:'Xīngqī liù wǎnshang qī diǎn, zài gōnggòng guǎngchǎng.',example:'星期六晚上七点，在公共广场。',success:'对，就是这个安排！小满准备卖茶，你也可以申请一个摊位。',reward:'公告上的安排已确认'},
 {id:'stall',title:'申请一个摊位',place:'广场东侧',npc:1,goal:'表达意愿，并选择可行的位置',line:'入口附近已经满了。广场东边还有位置。你想卖什么？愿意在哪里摆摊？',en:'The entrance is full. There is space on the east side. Say what you want to sell and choose a place.',hint:'我想卖……，可以在广场东边摆摊吗？',pinyin:'Wǒ xiǎng mài…, kěyǐ zài guǎngchǎng dōngbian bǎitān ma?',example:'我想卖茶，在东边摆摊。',success:'好，东边的位置留给你！还缺一张桌子，去问问修理铺的阿禾吧。',reward:'东边出现了你的摊位'},
 {id:'table',title:'借桌子，商量时间',place:'阿禾修理铺',npc:2,goal:'提出借物请求，回应时间变化并说明原因',line:'你想借桌子吗？四点还不行，我要修桌腿。六点可以来拿。夜市七点开始，你怎么安排？',en:'The table is being repaired. You can collect it at six, not four. Ask to borrow it and explain your plan.',hint:'可以借我一张桌子吗？我六点来拿，因为夜市七点开始。',pinyin:'Kěyǐ jiè wǒ yì zhāng zhuōzi ma? Wǒ liù diǎn lái ná, yīnwèi yèshì qī diǎn kāishǐ.',example:'能借一张桌子吗？我六点来拿，因为七点夜市开始。',success:'没问题，六点见！桌子已经备好。谢谢你愿意等我修好！现在请亲手布置摊台、招牌和装饰。',reward:'借到一张修好的桌子'},
 {id:'opening',title:'建造与开放',place:'你的茶摊',npc:0,goal:'在新对话中再次说明活动时间和位置',line:'灯亮啦！一位新来的朋友问：“我今晚几点来？去哪里找你？”请告诉他七点来广场东边。',en:'Invite a new visitor: say when to come and where to find your stall.',hint:'今晚……点，来广场……找我。',pinyin:'Jīnwǎn qī diǎn, lái guǎngchǎng dōngbian zhǎo wǒ.',example:'今晚七点来广场东边找我。',success:'朋友找到你了。小满端来茶，陈安挂起灯，阿禾坐下来歇一会儿。青禾街的第一晚，因为你热闹了一点。',reward:'你的夜市摊位正式开张'}
];
export const checks = [
 {id:'transfer-time',goal:'确认安排',line:'【读书会】星期日早上九点，在图书馆。请确认时间和地点。',example:'星期日早上九点，在图书馆。'},
 {id:'transfer-place',goal:'调整位置',line:'花园南边满了，北边还有位置。你想卖花，请向管理员说明想法和新位置。',example:'我想卖花，在花园北边摆摊。'},
 {id:'transfer-borrow',goal:'借物与说明原因',line:'邻居的椅子三点才能借，聚会四点开始。请借一把椅子并说明取用时间和原因。',example:'能借一把椅子吗？我三点来拿，因为聚会四点开始。'},
 {id:'delayed',goal:'隔天复测 · 确认新安排',line:'【种花活动】星期三下午两点，在社区花园。请确认日期、时间和地点。',example:'星期三下午两点，在社区花园。'},
 {id:'directions',goal:'公共新事件 · 问路',line:'新指路牌写着：洗手间在茶铺后面。游客问洗手间在哪儿，请帮他指路。',example:'洗手间在茶铺后面。'}
];
export function evaluate(id, input) {
 const t = [...tasks,...checks].find(t=>t.id===id);
 if (!t || typeof input !== 'string' || input.length>240) throw new Error('无效任务或输入过长');
 const s=input.normalize('NFKC').replace(/[\s，。！？、,.!?：:；;]/g,'');
 if (/没听懂|什么意思|再说|不明白|不懂/.test(s)) return {ok:false,kind:'clarify',message:'没关系，我们慢一点。'+t.line,example:t.example};
 const has=(r)=>r.test(s);
 const rejected=has(/不要|不想|不能|不在|不是|不借|不去|不可以|不愿意|不卖/);
 const rules={
 welcome:()=>/^(?:你好)?(?:我叫|我的名字是|你可以叫我|叫我)[\p{L}\p{N}·]{1,20}(?:很高兴认识你)?$/u.test(s),
 notice:()=>has(/星期六|周六|礼拜六/)&&has(/晚上[7七]点|晚[7七]点|19点|19:00/)&&has(/广场/),
 stall:()=>has(/想卖|要卖|想摆|想开/)&&has(/东边|东侧|东面/)&&!has(/入口/),
 table:()=>has(/借/)&&has(/桌/)&&has(/[6六]点|18点/)&&has(/因为|由于/)&&has(/七点|7点|19点/)&&has(/夜市/)&&!has(/四点|4点/),
 opening:()=>has(/[7七]点|19点/)&&has(/广场/)&&has(/东边|东侧|东面/),
 'transfer-time':()=>has(/星期日|星期天|周日|周天|礼拜天/)&&has(/早上|上午/)&&has(/[9九]点/)&&has(/图书馆/),
 'transfer-place':()=>has(/卖花/)&&has(/北边|北侧|北面/)&&!has(/南边/),
 'transfer-borrow':()=>has(/借/)&&has(/椅/)&&has(/[3三]点/)&&has(/因为|由于/)&&has(/聚会/)&&has(/[4四]点/),
 delayed:()=>has(/星期三|周三|礼拜三/)&&has(/下午/)&&has(/[2两二]点/)&&has(/花园/),
 directions:()=>has(/洗手间|厕所/)&&has(/茶铺/)&&has(/后面|后边|后方/)
 };
 const ok=!rejected&&rules[id]();
 return {ok,kind:ok?'success':'retry',message:ok?(t.success||'信息传达清楚了。谢谢你的帮助！'):'还需要确认关键信息。请对照场景检查时间、地点或请求；也可以查看帮助，换一种说法再试。',example:t.example};
}
