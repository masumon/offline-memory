export type AppLanguage='bn'|'en';

const localeFor=(language:AppLanguage)=>language==='bn'?'bn-BD':'en-BD';
function toDate(value:string|Date):Date{const date=value instanceof Date?value:new Date(value);if(Number.isNaN(date.getTime()))throw new Error('Invalid date/time value');return date;}

export function formatBangladeshDate(value:string|Date,language:AppLanguage):string{return new Intl.DateTimeFormat(localeFor(language),{year:'numeric',month:'long',day:'numeric'}).format(toDate(value));}
export function formatBangladeshDateTime(value:string|Date,language:AppLanguage):string{return new Intl.DateTimeFormat(localeFor(language),{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(toDate(value));}
export function formatBangladeshTime(value:string|Date,language:AppLanguage):string{return new Intl.DateTimeFormat(localeFor(language),{hour:'2-digit',minute:'2-digit',hour12:false}).format(toDate(value));}
export function formatBangladeshWeekdayDate(value:string|Date,language:AppLanguage):string{return new Intl.DateTimeFormat(localeFor(language),{weekday:'short',year:'numeric',month:'long',day:'numeric'}).format(toDate(value));}
