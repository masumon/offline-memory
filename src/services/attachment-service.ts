import type { SQLiteDatabase } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type AttachmentOwner = 'TASK' | 'MEMORY';
export interface Attachment { id:string; ownerType:AttachmentOwner; ownerId:string; name:string; mimeType:string; size:number|null; uri:string; createdAt:string; }

type AttachmentRow={id:string;owner_type:AttachmentOwner;owner_id:string;name:string;mime_type:string;size:number|null;uri:string;created_at:string};
const toAttachment=(row:AttachmentRow):Attachment=>({id:row.id,ownerType:row.owner_type,ownerId:row.owner_id,name:row.name,mimeType:row.mime_type,size:row.size,uri:row.uri,createdAt:row.created_at});
const safeName=(name:string)=>name.replace(/[^a-zA-Z0-9._-]+/gu,'_').slice(0,160)||'file';
const id=()=>`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

export async function listAttachments(db:SQLiteDatabase, ownerType:AttachmentOwner, ownerId:string):Promise<Attachment[]> {
  const rows=await db.getAllAsync<AttachmentRow>('SELECT id,owner_type,owner_id,name,mime_type,size,uri,created_at FROM attachments WHERE owner_type=? AND owner_id=? ORDER BY created_at DESC',ownerType,ownerId);
  return rows.map(toAttachment);
}

export async function addAttachments(db:SQLiteDatabase, ownerType:AttachmentOwner, ownerId:string):Promise<Attachment[]> {
  const result=await DocumentPicker.getDocumentAsync({type:'*/*',multiple:true,copyToCacheDirectory:true});
  if(result.canceled||!result.assets?.length)return [];
  const directory=FileSystem.documentDirectory;
  if(!directory)throw new Error('Local document storage is unavailable');
  const attachmentDirectory=`${directory}attachments/`;
  await FileSystem.makeDirectoryAsync(attachmentDirectory,{intermediates:true});
  const created:Attachment[]=[];
  for(const asset of result.assets){
    const attachmentId=id();
    const name=safeName(asset.name);
    const destination=`${attachmentDirectory}${attachmentId}-${name}`;
    await FileSystem.copyAsync({from:asset.uri,to:destination});
    await db.runAsync('INSERT INTO attachments (id,owner_type,owner_id,name,mime_type,size,uri,created_at) VALUES (?,?,?,?,?,?,?,?)',attachmentId,ownerType,ownerId,asset.name,asset.mimeType??'application/octet-stream',asset.size??null,destination,new Date().toISOString());
    created.push({id:attachmentId,ownerType,ownerId,name:asset.name,mimeType:asset.mimeType??'application/octet-stream',size:asset.size??null,uri:destination,createdAt:new Date().toISOString()});
  }
  return created;
}

export async function removeAttachment(db:SQLiteDatabase, attachment:Attachment):Promise<boolean>{
  try{await FileSystem.deleteAsync(attachment.uri,{idempotent:true});}catch{}
  const result=await db.runAsync('DELETE FROM attachments WHERE id=?',attachment.id);
  return result.changes>0;
}

export async function shareAttachment(attachment:Attachment):Promise<void>{
  if(!(await Sharing.isAvailableAsync()))throw new Error('File sharing is unavailable on this device');
  await Sharing.shareAsync(attachment.uri,{mimeType:attachment.mimeType,dialogTitle:attachment.name});
}
