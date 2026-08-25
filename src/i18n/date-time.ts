export type AppLanguage='bn'|'en';
export const BANGLADESH_TIME_ZONE='Asia/Dhaka' as const;
const localeFor=(language:AppLanguage)=>language==='bn'?'bn-BD':'en-BD';
function toDate(value:string|Date):Date{const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))throw new Error('Invalid date/time value');return date;}
const format=(value:string|Date,language:AppLanguage,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(localeFor(language),{...options,timeZone:BANGLADESH_TIME_ZONE}).format(toDate(value));
function dhakaCalendarDay(value:string|Date):number{const date=toDate(value);const parts=new Intl.DateTimeFormat('en-US',{timeZone:BANGLADESH_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const year=Number(parts.find(part=>part.type==='year')?.value);const month=Number(parts.find(part=>part.type==='month')?.value);const day=Number(parts.find(part=>part.type==='day')?.value);if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day))throw new Error('Invalid Bangladesh calendar date');return Date.UTC(year,month-1,day);}
export function formatBangladeshDate(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshDateTime(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshTime(value:string|Date,language:AppLanguage):string{return format(value,language,{hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshWeekdayDate(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'short',year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshMonthYear(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long'});}
export function formatBangladeshWeekday(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'long'});}
export function formatBangladeshNumber(value:number,language:AppLanguage):string{return new Intl.NumberFormat(localeFor(language)).format(value);}
export function formatBangladeshRelativeDate(value:string|Date,language:AppLanguage,now=new Date()):string{const diff=Math.round((dhakaCalendarDay(value)-dhakaCalendarDay(now))/86400000);if(language==='bn'){if(diff===0)return 'আজ';if(diff===1)return 'আগামীকাল';if(diff===-1)return 'গতকাল';}else{if(diff===0)return 'Today';if(diff===1)return 'Tomorrow';if(diff===-1)return 'Yesterday';}return formatBangladeshDate(value,language);}
