import type { SQLiteDatabase } from 'expo-sqlite';
import { unzipSync } from 'fflate';
import { Directory, File, Paths } from 'expo-file-system';
import { restoreSQLiteBackupData } from '../backup/sqlite-restore';
import { base64ToBytes, parseBackupArchive, type BackupArchiveAttachment } from './backup-archive-service';

function safeName(name:string):string{return name.replace(/[^a-zA-Z0-9._-]+/gu,'_').slice(0,160)||'file';}

export interface RestoreArchiveResult { attachmentCount:number; cleanedOldAttachments:number; }

type ExistingAttachment={uri:string};

export async function restoreBackupArchive(db:SQLiteDatabase, bytes:Uint8Array):Promise<RestoreArchiveResult>{
  const manifest=parseBackupArchive(bytes);
  const files=unzipSync(bytes);
  const attachmentDirectory=new Directory(Paths.document,'attachments');
  attachmentDirectory.create({intermediates:true,idempotent:true});
  const existing=await db.getAllAsync<ExistingAttachment>('SELECT uri FROM attachments');
  const nonce=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const prepared:File[]=[];
  const rows:Record<string,unknown>[]=[];

  try{
    for(const attachment of manifest.attachments as BackupArchiveAttachment[]){
      const payload=files[`attachments/${attachment.id}`];
      if(!payload)throw new Error(`Backup attachment data is missing: ${attachment.id}`);
      if(attachment.size!==null&&payload.byteLength!==attachment.size)throw new Error(`Backup attachment size mismatch: ${attachment.id}`);
      const file=new File(attachmentDirectory,`${attachment.id}-restore-${nonce}-${safeName(attachment.name)}`);
      file.write(payload);
      prepared.push(file);
      rows.push({id:attachment.id,owner_type:attachment.ownerType,owner_id:attachment.ownerId,name:attachment.name,mime_type:attachment.mimeType,size:attachment.size,uri:file.uri,created_at:attachment.createdAt});
    }

    await restoreSQLiteBackupData(db,{format:'offline-memory-backup',version:1,createdAt:manifest.createdAt,data:{...manifest.data,attachments:rows}});
  }catch(error){
    for(const file of prepared){try{file.delete()}catch{}}
    throw error;
  }

  let cleanedOldAttachments=0;
  for(const item of existing){
    try{new File(item.uri).delete();cleanedOldAttachments+=1}catch{}
  }
  return {attachmentCount:rows.length,cleanedOldAttachments};
}

export function decodeBackupArchiveBase64(value:string):Uint8Array{return base64ToBytes(value);}
