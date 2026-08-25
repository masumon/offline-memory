export type AppLanguage='bn'|'en';
const localeFor=(language:AppLanguage)=>language==='bn'?'bn-BD':'en-BD';
function toDate(value:string|Date):Date{const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))throw new Error('Invalid date/time value');return date;}
const format=(value:string|Date,language:AppLanguage,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(localeFor(language),options).format(toDate(value));
export function formatBangladeshDate(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshDateTime(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshTime(value:string|Date,language:AppLanguage):string{return format(value,language,{hour:'2-digit',minute:'2-digit',hour12:false});}
export function formatBangladeshWeekdayDate(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'short',year:'numeric',month:'long',day:'numeric'});}
export function formatBangladeshMonthYear(value:string|Date,language:AppLanguage):string{return format(value,language,{year:'numeric',month:'long'});}
export function formatBangladeshWeekday(value:string|Date,language:AppLanguage):string{return format(value,language,{weekday:'long'});}
export function formatBangladeshNumber(value:number,language:AppLanguage):string{return new Intl.NumberFormat(localeFor(language)).format(value);}
export function formatBangladeshRelativeDate(value:string|Date,language:AppLanguage,now=new Date()):string{const date=toDate(value);const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());const target=new Date(date.getFullYear(),date.getMonth(),date.getDate());const diff=Math.round((target.getTime()-start.getTime())/86400000);if(language==='bn'){if(diff===0)return 'আজ';if(diff===1)return 'আগামীকাল';if(diff===-1)return 'গতকাল';}else{if(diff===0)return 'Today';if(diff===1)return 'Tomorrow';if(diff===-1)return 'Yesterday';}return formatBangladeshDate(date,language);}
