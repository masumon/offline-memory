import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { AppIcon } from './AppIcon';
import { useAppPreferences } from '../app/AppPreferences';
import { spacing, type ThemeColors } from '../theme';

function parseDate(value:string|undefined,fallback:Date){if(!value)return fallback;const date=new Date(value);return Number.isNaN(date.getTime())?fallback:date;}
const dateKey=(date:Date)=>{const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`};
const iso=(date:Date)=>date.toISOString();

export function PlannedDateField({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const{colors,language}=useAppPreferences();const bn=language==='bn';const styles=useMemo(()=>makeStyles(colors),[colors]);const[open,setOpen]=useState(false);const date=value?parseDate(`${value}T00:00:00`,new Date()):new Date();const label=value?new Intl.DateTimeFormat(bn?'bn-BD':'en-BD',{weekday:'short',year:'numeric',month:'long',day:'numeric'}).format(date):(bn?'তারিখ বাছাই করুন':'Choose date');
 return <View><Text style={styles.label}>{bn?'পরিকল্পিত তারিখ':'Planned date'}</Text><Pressable onPress={()=>setOpen(true)} style={({pressed})=>[styles.field,pressed&&styles.pressed]} accessibilityRole="button" accessibilityLabel={label}><AppIcon name="calendar-month-outline" size={20} color={colors.primary}/><Text style={[styles.value,!value&&styles.placeholder]}>{label}</Text><AppIcon name="chevron-down" size={18} color={colors.textMuted}/></Pressable>{open?<ExpoDateTimePicker value={date} mode="date" presentation="dialog" onValueChange={(_,selected)=>{if(selected){onChange(dateKey(selected));setOpen(false)}}} onDismiss={()=>setOpen(false)} is24Hour/>:null}</View>;
}

export function DueDateTimeField({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const{colors,language}=useAppPreferences();const bn=language==='bn';const styles=useMemo(()=>makeStyles(colors),[colors]);const[step,setStep]=useState<'date'|'time'|null>(null);const current=parseDate(value,new Date());const label=value?new Intl.DateTimeFormat(bn?'bn-BD':'en-BD',{dateStyle:'medium',timeStyle:'short',hour12:false}).format(current):(bn?'তারিখ ও সময় বাছাই করুন':'Choose date & time');
 return <View><Text style={styles.label}>{bn?'ডিউ তারিখ ও সময়':'Due date & time'}</Text><Pressable onPress={()=>setStep('date')} style={({pressed})=>[styles.field,pressed&&styles.pressed]} accessibilityRole="button" accessibilityLabel={label}><AppIcon name="calendar-clock-outline" size={20} color={colors.primary}/><Text style={[styles.value,!value&&styles.placeholder]}>{label}</Text><AppIcon name="chevron-down" size={18} color={colors.textMuted}/></Pressable>{step==='date'?<ExpoDateTimePicker value={current} mode="date" presentation="dialog" onValueChange={(_,selected)=>{if(selected){const next=new Date(current);next.setFullYear(selected.getFullYear(),selected.getMonth(),selected.getDate());onChange(iso(next));setStep('time')}}} onDismiss={()=>setStep(null)} is24Hour/>:null}{step==='time'?<ExpoDateTimePicker value={current} mode="time" presentation="dialog" onValueChange={(_,selected)=>{if(selected){const next=new Date(current);next.setHours(selected.getHours(),selected.getMinutes(),0,0);onChange(iso(next));setStep(null)}}} onDismiss={()=>setStep(null)} is24Hour/>:null}</View>;
}
function makeStyles(colors:ThemeColors){return StyleSheet.create({label:{color:colors.textSecondary,fontSize:12,fontWeight:'800',marginTop:spacing.md,marginBottom:spacing.xs},field:{minHeight:54,borderWidth:1,borderColor:colors.border,borderRadius:15,backgroundColor:colors.surfaceMuted,paddingHorizontal:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.sm},value:{flex:1,color:colors.textPrimary,fontSize:14,fontWeight:'700'},placeholder:{color:colors.textMuted,fontWeight:'500'},pressed:{opacity:.78}})}
