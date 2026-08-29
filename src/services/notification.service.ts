import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
const TASK_CHANNEL_ID='task-reminders';
const BRAND_GREEN='#0B7A55';
if(typeof Notifications.setNotificationHandler==='function'){Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});}
export async function initializeNotifications():Promise<void>{if(Platform.OS!=='android')return;try{await Notifications.setNotificationChannelAsync(TASK_CHANNEL_ID,{name:'Task reminders · টাস্ক রিমাইন্ডার',description:'Offline Memory task reminders · Offline Memory টাস্ক রিমাইন্ডার',importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,250,250,250],lockscreenVisibility:Notifications.AndroidNotificationVisibility.PUBLIC,enableVibrate:true,showBadge:true});}catch{}}
export async function requestNotificationPermission():Promise<boolean>{try{const current=await Notifications.getPermissionsAsync();if(current.granted)return true;const requested=await Notifications.requestPermissionsAsync();return requested.granted;}catch{return false;}}
export { TASK_CHANNEL_ID, BRAND_GREEN };
