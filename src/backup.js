import path from 'node:path';
import {backupStore,dataDir} from './store.js';
const name='han-start-'+new Date().toISOString().replaceAll(':','-').replaceAll('.','-')+'.sqlite';
const destination=path.resolve(process.argv[2]||path.join(dataDir,'backups',name));
console.log('已完成 SQLite 一致性备份：'+await backupStore(destination));
