import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export default async function getDbInstance(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('postgres://root:secret@yangjuiyu.tplinkdns.com:5432/app');
  }
  return dbInstance;
}