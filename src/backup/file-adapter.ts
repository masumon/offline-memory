import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { strFromU8 } from 'fflate';
import type { M7BackupDocument } from './m7-format';
import { parseM7BackupDocument } from './m7-format';
import { base64ToBytes, bytesToBase64, encodeBackupArchive } from '../services/backup-archive-service';

const BACKUP_MIME='application/json';
const ARCHIVE_MIME='application/zip';
const BACKUP_PREFIX='offline-memory-backup-';
const ARCHIVE_PREFIX='offline-memory-backup-';
export async function writeBackupFile(document:M7BackupDocument):Promise<string>{const directory=FileSystem.documentDirectory;if(!directory)throw new Error('Device document storage is unavailable');const filename=`${BACKUP_PREFIX}${document.createdAt.replace(/[:.]/g,'-')}.json`;const uri=`${directory}${filename}`;await FileSystem.writeAsStringAsync(uri,JSON.stringify(document,null,2),{encoding:FileSystem.EncodingType.UTF8});return uri}
export async function writeBackupArchiveFile(bytes:Uint8Array,createdAt:string):Promise<string>{const directory=FileSystem.documentDirectory;if(!directory)throw new Error('Device document storage is unavailable');const filename=`${ARCHIVE_PREFIX}${createdAt.replace(/[:.]/g,'-')}.zip`;const uri=`${directory}${filename}`;await FileSystem.writeAsStringAsync(uri,encodeBackupArchive(bytes),{encoding:FileSystem.EncodingType.Base64});return uri}
export async function shareBackupFile(uri:string):Promise<void>{if(!(await Sharing.isAvailableAsync()))throw new Error('File sharing is unavailable on this device');await Sharing.shareAsync(uri,{mimeType:BACKUP_MIME,dialogTitle:'Share Offline Memory backup'})}
export async function shareBackupArchiveFile(uri:string):Promise<void>{if(!(await Sharing.isAvailableAsync()))throw new Error('File sharing is unavailable on this device');await Sharing.shareAsync(uri,{mimeType:ARCHIVE_MIME,dialogTitle:'Share Offline Memory backup archive'})}
export type PickedBackup={kind:'json';document:M7BackupDocument}|{kind:'archive';bytes:Uint8Array};
export async function pickBackupBundle():Promise<PickedBackup|null>{const result=await DocumentPicker.getDocumentAsync({type:[BACKUP_MIME,ARCHIVE_MIME,'text/json','*/*'],copyToCacheDirectory:true,multiple:false});if(result.canceled)return null;const uri=result.assets[0]?.uri;if(!uri)throw new Error('Selected backup file has no URI');const encoded=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});const bytes=base64ToBytes(encoded);if(bytes.length>=2&&bytes[0]===0x50&&bytes[1]===0x4b)return{kind:'archive',bytes};let document:M7BackupDocument;try{document=parseM7BackupDocument(JSON.parse(strFromU8(bytes)))}catch(error){throw new Error(error instanceof Error?`Invalid backup file: ${error.message}`:'Invalid backup file')}return{kind:'json',document}}
export async function pickBackupFile():Promise<M7BackupDocument|null>{const picked=await pickBackupBundle();return picked?.kind==='json'?picked.document:null}
export function encodeSelectedBackup(bytes:Uint8Array):string{return bytesToBase64(bytes)}
