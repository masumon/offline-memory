export type AppLanguage='bn'|'en';
const localeFor=(language:AppLanguage)=>language==='bn'?'bn-BD':'en-BD';
const BANGLADESH_TIME_ZONE='Asia/Dhaka';
function toDate(value:string|Date):Date{const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))throw new Error('Invalid date/time value');return date;}
const format=(value:string|Date,language:AppLanguage,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(localeFor(language),{...options,timeZone:BANGLADESH_TIME_ZONE}).format(toDate(value));
export function getBangladeshDateKey(value:string|Date):string{const date=toDate(value);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:BANGLADESH_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const year=parts.find((part)=>part.type==='year')?.value;const month=parts.find((part)=>part.type==='month')?.value;const day=parts.find((part)=>part.type==='day')?.value;if(!year||!month||!day)throw new Error('Unable to format Bangladesh date');return `${year}-${month}-${day}`;}
function dateKeyToUtcMs(key:string):number{const [year,month,day]=key.split('-').map(Number);return Date.UTC(year,month-1,day);}
export function formatBangladeshDate(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshDateTime(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshTime(value:string|Date,language:AppLanguage):string{return format(value,language,{hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshWeekdayDate(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'short',year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshMonthYear(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long'});}
export function formatBangladeshWeekday(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'long'});}
export function formatBangladeshNumber(value:number,language:AppLanguage):string{return new Intl.NumberFormat(localeFor(language)).format(value);}
export function formatBangladeshRelativeDate(value:string|Date,language:AppLanguage,now=new Date()):string{const diff=Math.round((dateKeyToUtcMs(getBangladeshDateKey(value))-dateKeyToUtcMs(getBangladeshDateKey(now)))/86400000);if(language==='bn'){if(diff===0)return 'আজ';if(diff===1)return 'আগামীকাল';if(diff===-1)return 'গতকাল';}else{if(diff===0)return 'Today';if(diff===1)return 'Tomorrow';if(diff===-1)return 'Yesterday';}return formatBangladeshDate(value,language);}
