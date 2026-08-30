import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { hasNotificationBeenDelivered, markNotificationDelivered } from './notification-delivery-repository';
import { getTask } from './task-repository';
import { BRAND_GREEN, initializeNotifications, requestNotificationPermission, TASK_CHANNEL_ID } from './notification.service';
import type { NotificationCandidate } from './scheduler-notification-service';
function notificationData(notification:Notifications.NotificationRequest):{taskId?:string;dueAt?:string}{const data=notification.content.data as {taskId?:unknown;dueAt?:unknown}|undefined;return{taskId:typeof data?.taskId==='string'?data.taskId:undefined,dueAt:typeof data?.dueAt==='string'?data.dueAt:undefined};}

// Deterministic identifier so re-running the scheduler (mount + AppState "active" +
// 15-min tick can overlap) can only ever *replace* a task's reminder, never duplicate
// it. Expo/OS keys scheduled notifications by identifier.
function reminderIdentifier(taskId:string,dueAt:string):string{return `task-reminder:${taskId}:${dueAt}`;}

export interface QuietHours { start: number; end: number }

/** If a reminder would fire inside the user's quiet window, delay it to the window's
 * end. The notification keeps the task's real dueAt in its data for dedup/reconcile. */
export function applyQuietHours(due: Date, quiet?: QuietHours | null): Date {
  if (!quiet || quiet.start === quiet.end) return due;
  const h = due.getHours();
  const inWindow = quiet.start < quiet.end ? h >= quiet.start && h < quiet.end : h >= quiet.start || h < quiet.end;
  if (!inWindow) return due;
  const shifted = new Date(due);
  shifted.setHours(quiet.end, 0, 0, 0);
  if (quiet.start >= quiet.end && h >= quiet.start) shifted.setDate(shifted.getDate() + 1); // crossed midnight
  return shifted.getTime() <= Date.now() ? due : shifted;
}
/** `taskId:dueAt` keys the OS still has scheduled — for the scheduler to detect and
 * re-add reminders that a battery optimiser / Doze silently dropped. */
export async function getLiveScheduledKeys():Promise<ReadonlySet<string>>{const scheduled=await Notifications.getAllScheduledNotificationsAsync();const keys=new Set<string>();for(const notification of scheduled){const{taskId,dueAt}=notificationData(notification);if(taskId&&dueAt)keys.add(`${taskId}:${dueAt}`);}return keys;}

export async function reconcileScheduledTaskNotifications(db:SQLiteDatabase,now=new Date()):Promise<number>{const scheduled=await Notifications.getAllScheduledNotificationsAsync();let cancelled=0;const seen=new Set<string>();for(const notification of scheduled){const{taskId,dueAt}=notificationData(notification);if(!taskId||!dueAt)continue;
 // Collapse duplicate OS reminders for the same task+time regardless of delivered-state
 // (older builds could double-schedule; this is the only pass that isn't delivery-gated).
 const key=`${taskId}|${dueAt}`;if(seen.has(key)){await Notifications.cancelScheduledNotificationAsync(notification.identifier);cancelled+=1;continue;}
 const task=await getTask(db,taskId);const validStatus=task?.status==='PLANNED'||task?.status==='RESCHEDULED';const dueDate=new Date(dueAt);const valid=Boolean(task&&validStatus&&task.dueAt===dueAt&&!Number.isNaN(dueDate.getTime())&&dueDate.getTime()>now.getTime());if(!valid){await Notifications.cancelScheduledNotificationAsync(notification.identifier);cancelled+=1;continue;}
 seen.add(key);}return cancelled;}
export async function scheduleTaskNotification(db:SQLiteDatabase,candidate:NotificationCandidate,quietHours?:QuietHours|null):Promise<string|null>{if(await hasNotificationBeenDelivered(db,candidate.taskId,candidate.dueAt))return null;const dueAtRaw=new Date(candidate.dueAt);if(Number.isNaN(dueAtRaw.getTime())||dueAtRaw.getTime()<=Date.now())return null;const dueAt=applyQuietHours(dueAtRaw,quietHours);const scheduled=await Notifications.getAllScheduledNotificationsAsync();
 // Collapse any duplicates for this exact task+time (overlapping scheduler passes could
 // previously each create their own OS reminder). Keep the first, cancel the rest.
 const matches=scheduled.filter(item=>{const data=notificationData(item);return data.taskId===candidate.taskId&&data.dueAt===candidate.dueAt;});
 if(matches.length){for(const extra of matches.slice(1)){try{await Notifications.cancelScheduledNotificationAsync(extra.identifier);}catch{}}return matches[0]!.identifier;}
 await initializeNotifications();if(!(await requestNotificationPermission()))return null;const notificationId=await Notifications.scheduleNotificationAsync({identifier:reminderIdentifier(candidate.taskId,candidate.dueAt),content:{title:'Offline Memory · Reminder',body:candidate.title,data:{taskId:candidate.taskId,dueAt:candidate.dueAt},color:BRAND_GREEN,priority:Notifications.AndroidNotificationPriority.HIGH},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:dueAt,...(Platform?.OS==='android'?{channelId:TASK_CHANNEL_ID}:{})}});try{await markNotificationDelivered(db,candidate.taskId,candidate.dueAt);return notificationId;}catch(error){await Notifications.cancelScheduledNotificationAsync(notificationId);throw error;}}
