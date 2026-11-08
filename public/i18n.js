import {translations} from './translations.js';
export const languages=[{id:'vi',label:'Tiếng Việt'},{id:'id',label:'Bahasa Indonesia'},{id:'pt-BR',label:'Português (Brasil)'},{id:'en',label:'English'},{id:'zh',label:'简体中文'}];
export const choose=(lang,zh,en)=>lang==='zh'?zh:(translations[en]?.[lang]??en);
export const lessonEnglish={
 welcome:{title:'Meet your first neighbor',goal:'Introduce yourself in Chinese',place:'Xiaoman’s tea shop',hint:'我叫 means “My name is”. Add your own name, in Chinese or Latin letters.',success:'Nice to meet you! Here is your street map. Visit Chen An at the square to read the notice.'},
 notice:{title:'Read the market notice',goal:'Confirm the day, time and place',place:'Community square',hint:'星期六 = Saturday; 晚上七点 = 7 p.m.; 公共广场 = community square.',success:'That’s right! Xiaoman will sell tea. You can apply for your own stall too.'},
 stall:{title:'Find a place for your stall',goal:'Say what you want to sell and choose an available spot',place:'East side of the square',hint:'我想卖 = I want to sell; 东边 / 东侧 = east side; 摆摊 = set up a stall.',success:'The east-side spot is yours. Ask A-He at the repair shop if you can borrow a table.'},
 table:{title:'Borrow a table',goal:'Ask to borrow something and explain a change of time',place:'A-He’s repair shop',hint:'借 = borrow; 六点 = six o’clock; 因为 = because. Include why collecting it at six works.',success:'Of course! Collect it at six. Thanks for waiting while I fix it. Now arrange the counter, sign and a decoration yourself.'},
 opening:{title:'Build it. Then open for the evening.',goal:'Save your own layout, then invite a visitor in Chinese',place:'Your own stall',hint:'今晚七点 = tonight at seven; 广场东边 = east side of the square; 来找我 = come and find me.',success:'Your friend found you! Xiaoman brings tea, Chen An hangs the lights, and A-He remembers lending you the table.'},
 'transfer-time':{title:'Confirm a new arrangement',goal:'Read a fresh notice and confirm its details'},
 'transfer-place':{title:'Choose another location',goal:'Explain a plan when the first location is full'},
 'transfer-borrow':{title:'Borrow in a new situation',goal:'Ask, agree on a time, and explain why'},
 delayed:{title:'A little practice for tomorrow',goal:'Understand a new day, time and place'},
 directions:{title:'Help a visitor find their way',goal:'Use the shared sign to give directions'}
};
export const errors={
 invalid_layout:['请填写 1–32 字的作品名，最多放置 8 个组件。','Use a name of 1–32 characters and up to 8 pieces.'],
 invalid_component:['组件或参数无效。','That component or setting is not valid.'],
 component_limit:['这种组件已达到数量上限。','You have reached the limit for this type of piece.'],
 out_of_bounds:['超出建设区域，请换个位置或方向。','That piece would extend beyond your plot. Try another cell or rotation.'],
 collision:['这里已被占用，请选择空位置。','These pieces overlap. Choose a free space.'],
 missing_components:['至少放置一个摊台、一块招牌和一盏灯或一盆植物。','Place a counter, a sign, and at least one lantern or plant.'],
 not_owner:['只能修改自己的作品。','You can only edit your own private work.'],
 version_conflict:['版本已变化，未覆盖你的修改。请导出草稿，刷新后对比最新版本再保存或提交。','A newer version exists. Your changes have not overwritten it. Export your draft, reload, and compare before saving or submitting again.'],
 invalid_correction:['请选择公开作品中的招牌，填写 1–24 字的新文字。','Choose a sign in a shared work and enter 1–24 characters.'],
 duplicate:['这条内容已经提交过。','This contribution has already been submitted.'],
 request_failed:['操作未完成。检查内容、身份和状态。投稿须 8–600 字，每小时最多五条。','Could not complete this action. Check the content and its status. Contributions need 8–600 characters, with a limit of five per hour.']
};
export function errorText(code,lang){const pair=errors[code]||errors.request_failed;return choose(lang,...pair);}
export const statusText={submitted:['已提交','Submitted'],reviewing:['待审核','In review'],changes:['需修改','Changes requested'],approved:['已通过，等待发布','Approved, awaiting publication'],rejected:['未采纳','Not accepted'],published:['已发布','Published'],withdrawn:['已撤回','Withdrawn'],archived:['已归档','Archived']};
export const residentEnglish=[{name:'Lin Xiaoman',role:'Tea shop owner',bio:'She introduces newcomers to the street. Tonight she is sharing osmanthus tea.'},{name:'Chen An',role:'Square caretaker',bio:'He keeps the entrance clear and arranges stalls along the sides of the square.'},{name:'A-He',role:'Repair shop neighbor',bio:'He is happy to lend a table, once its legs are repaired. Agree on a time and help each other.'}];
