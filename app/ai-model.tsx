import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AppIcon } from '../src/ui/AppIcon';
import { AppConfirmDialog, useAppFeedback } from '../src/ui/AppFeedback';
import { aiModelCopy } from '../src/i18n/ai-model';
import { FREE_MODELS } from '../src/ai/model/free-models';
import {
  loadInstalledModel, pickAndImportModel, removeModel, verifyModel, probeRuntime,
  ModelImportError, type InstalledModel, type VerifyReport, type CheckStatus,
} from '../src/ai/model/model-manager';
import { border, elevation, icon, layout, radius, spacing, typography, type ThemeAccents, type ThemeColors } from '../src/theme';

const STATUS_ICON: Record<CheckStatus, { name: string; tone: 'green' | 'orange' | 'red' | 'blue' }> = {
  pass: { name: 'check-circle', tone: 'green' },
  warn: { name: 'alert-circle-outline', tone: 'orange' },
  fail: { name: 'close-circle-outline', tone: 'red' },
  skip: { name: 'minus-circle-outline', tone: 'blue' },
};

export default function AiModelScreen() {
  const db = useSQLiteContext();
  const { colors, accents, language } = useAppPreferences();
  const bn = language === 'bn';
  const c = aiModelCopy(language);
  const styles = useMemo(() => makeStyles(colors, accents), [colors, accents]);
  const { showSnackbar } = useAppFeedback();

  const [model, setModel] = useState<InstalledModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const runtime = useMemo(() => probeRuntime(), []);

  useEffect(() => {
    let active = true;
    loadInstalledModel(db)
      .then((m) => { if (!active) return; setModel(m); setReport(m?.lastReport ?? null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db]);

  const onPick = async () => {
    if (picking) return;
    setPicking(true);
    setReport(null);
    try {
      const m = await pickAndImportModel(db);
      if (m) { setModel(m); showSnackbar(bn ? 'মডেল যোগ হয়েছে — এবার যাচাই করুন।' : 'Model added — now verify it.', 'success'); }
    } catch (e) {
      const msg = e instanceof ModelImportError ? e.message : (bn ? 'যোগ করা গেল না।' : 'Could not add it.');
      showSnackbar(msg, 'danger');
    } finally {
      setPicking(false);
    }
  };

  const onVerify = async () => {
    if (!model || verifying) return;
    setVerifying(true);
    try {
      const r = await verifyModel(db, model);
      setReport(r);
      const fresh = await loadInstalledModel(db);
      setModel(fresh);
      showSnackbar(r.ok ? c.resultReady : c.resultProblem, r.ok ? 'success' : 'danger');
    } finally {
      setVerifying(false);
    }
  };

  const onRemove = async () => {
    setConfirmRemove(false);
    await removeModel(db);
    setModel(null);
    setReport(null);
    showSnackbar(bn ? 'মডেল সরানো হয়েছে।' : 'Model removed.', 'info');
  };

  const copyLink = async (id: string, url: string) => {
    try { await Clipboard.setStringAsync(url); setCopiedId(id); setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1800); } catch { /* noop */ }
  };

  const sizeMB = model ? Math.round(model.sizeBytes / (1024 * 1024)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => StyleSheet.flatten([styles.back, pressed && styles.pressed])}>
          <AppIcon name="arrow-left" size={icon.md} color={colors.primary} />
          <Text style={styles.backText}>{c.back}</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}><AppIcon name="robot-happy-outline" size={icon.lg} color={accents.purple.on} /></View>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>{c.eyebrow}</Text>
            <Text style={styles.title}>{c.title}</Text>
          </View>
        </View>
        <Text style={styles.intro}>{c.intro}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Installed model */}
        <Text style={styles.section}>{c.installed}</Text>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : model ? (
            <>
              <View style={styles.modelHead}>
                <View style={styles.modelIcon}><AppIcon name="cube-outline" size={icon.md} color={accents.blue.on} /></View>
                <View style={styles.modelCopy}>
                  <Text style={styles.modelName} numberOfLines={2}>{model.name}</Text>
                  <Text style={styles.modelMeta}>{c.size}: {sizeMB} MB{model.verifiedAt ? `  ·  ${c.resultReady}` : ''}</Text>
                </View>
              </View>
              <View style={styles.specRow}>
                <Spec label={c.arch} value={model.summary.architecture ?? '—'} styles={styles} />
                <Spec label={c.quant} value={model.summary.quantLabel} styles={styles} />
                <Spec label={c.context} value={model.summary.contextLength ? `${model.summary.contextLength}` : '—'} styles={styles} />
              </View>
              <View style={styles.actionRow}>
                <Pressable accessibilityRole="button" disabled={verifying} onPress={() => void onVerify()} style={({ pressed }) => StyleSheet.flatten([styles.primaryBtn, verifying && styles.disabled, pressed && styles.pressed])}>
                  {verifying ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <><AppIcon name="shield-check-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryBtnText}>{report ? c.verifyAgain : c.verify}</Text></>}
                </Pressable>
                <Pressable accessibilityRole="button" disabled={picking} onPress={() => void onPick()} style={({ pressed }) => StyleSheet.flatten([styles.ghostBtn, pressed && styles.pressed])}>
                  <AppIcon name="file-replace-outline" size={icon.sm} color={colors.primary} />
                  <Text style={styles.ghostBtnText}>{c.replace}</Text>
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(true)} hitSlop={8} style={({ pressed }) => StyleSheet.flatten([styles.removeLink, pressed && styles.pressed])}>
                <AppIcon name="delete-outline" size={icon.xs} color={colors.danger} />
                <Text style={styles.removeLinkText}>{c.remove}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>{c.notInstalled}</Text>
              <Pressable accessibilityRole="button" disabled={picking} onPress={() => void onPick()} style={({ pressed }) => StyleSheet.flatten([styles.primaryBtn, styles.primaryBtnWide, picking && styles.disabled, pressed && styles.pressed])}>
                {picking ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <><AppIcon name="folder-open-outline" size={icon.sm} color={colors.onPrimary} /><Text style={styles.primaryBtnText}>{c.pick}</Text></>}
              </Pressable>
            </>
          )}
        </View>

        {/* Verify report */}
        {report ? (
          <View style={[styles.card, styles.reportCard, { borderColor: report.ok ? accents.green.border : accents.orange.border }]}>
            <View style={styles.reportHead}>
              <AppIcon name={report.ok ? 'check-decagram' : 'alert-decagram-outline'} size={icon.md} color={report.ok ? accents.green.on : accents.orange.on} />
              <Text style={[styles.reportTitle, { color: report.ok ? accents.green.on : accents.orange.on }]}>{report.ok ? c.resultReady : c.resultProblem}</Text>
            </View>
            {report.steps.map((s) => {
              const si = STATUS_ICON[s.status];
              return (
                <View key={s.id} style={styles.step}>
                  <AppIcon name={si.name as never} size={icon.sm} color={accents[si.tone].on} />
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepLabel}>{s.label[language]}</Text>
                    <Text style={styles.stepDetail}>{s.detail[language]}</Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.reportTime}>{c.lastChecked}: {new Date(report.ranAt).toLocaleString()}</Text>
          </View>
        ) : null}

        {/* Runtime-missing explainer */}
        {!runtime.available ? (
          <View style={[styles.card, styles.noticeCard]}>
            <View style={styles.noticeHead}>
              <AppIcon name="information-outline" size={icon.md} color={accents.blue.on} />
              <Text style={styles.noticeTitle}>{c.runtimeMissingTitle}</Text>
            </View>
            <Text style={styles.noticeBody}>{c.runtimeMissingBody}</Text>
          </View>
        ) : null}

        {/* Free models */}
        <Text style={styles.section}>{c.freeTitle}</Text>
        <Text style={styles.freeIntro}>{c.freeIntro}</Text>
        {FREE_MODELS.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.freeName}>{m.name[language]}</Text>
            <Text style={styles.freeStrength}>{m.strength[language]}</Text>
            <View style={styles.freeMetaRow}>
              <Text style={styles.freeMeta}>{m.paramLabel} · {m.quant}</Text>
              <Text style={styles.freeMeta}>{m.fileSizeLabel}</Text>
              <Text style={styles.freeMeta}>{c.ram} ~{(m.ramNeedMB / 1024).toFixed(1)} GB</Text>
            </View>
            <View style={styles.freeLinkRow}>
              <Text style={styles.freeLink} numberOfLines={1}>{m.source}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={c.copyLink} onPress={() => void copyLink(m.id, `https://${m.source}`)} style={({ pressed }) => StyleSheet.flatten([styles.copyBtn, pressed && styles.pressed])}>
                <AppIcon name={copiedId === m.id ? 'check' : 'content-copy'} size={icon.xs} color={colors.primary} />
                <Text style={styles.copyBtnText}>{copiedId === m.id ? c.copied : c.copyLink}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* How it works */}
        <Text style={styles.section}>{c.howTitle}</Text>
        <View style={styles.card}>
          {[c.how1, c.how2, c.how3, c.how4].map((line) => (
            <View key={line} style={styles.howRow}>
              <AppIcon name="circle-small" size={icon.md} color={colors.primary} />
              <Text style={styles.howText}>{line}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footerRow}>
          <AppIcon name="shield-check-outline" size={icon.xs} color={colors.success} />
          <Text style={styles.footer}>{bn ? '১০০% অফলাইন — মডেল ও যাচাই সবই এই ফোনে।' : '100% offline — the model and every check stay on this phone.'}</Text>
        </View>
      </ScrollView>

      <AppConfirmDialog
        visible={confirmRemove}
        title={c.removeConfirmTitle}
        description={c.removeConfirmBody}
        confirmLabel={c.removeConfirm}
        cancelLabel={c.cancel}
        danger
        onConfirm={() => void onRemove()}
        onCancel={() => setConfirmRemove(false)}
      />
    </View>
  );
}

function Spec({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors, accents: ThemeAccents) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: border.thin, borderBottomColor: colors.border },
    back: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backText: { color: colors.primary, ...typography.body, fontWeight: '800' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    titleIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: accents.purple.soft, alignItems: 'center', justifyContent: 'center' },
    titleCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.primary, ...typography.label, fontWeight: '900', letterSpacing: 0.8 },
    title: { color: colors.textPrimary, ...typography.titleLarge, fontWeight: '900', marginTop: spacing.xxs },
    intro: { color: colors.textSecondary, ...typography.bodySmall, lineHeight: 20, marginTop: spacing.sm },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    section: { color: colors.textMuted, ...typography.section, fontWeight: '900', letterSpacing: 1.1, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: { backgroundColor: colors.surface, borderWidth: border.thin, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, ...elevation.soft, marginBottom: spacing.sm },
    modelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    modelIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: accents.blue.soft, alignItems: 'center', justifyContent: 'center' },
    modelCopy: { flex: 1, minWidth: 0 },
    modelName: { color: colors.textPrimary, ...typography.body, fontWeight: '900' },
    modelMeta: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs },
    specRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    spec: { flex: 1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.smd },
    specLabel: { color: colors.textMuted, ...typography.caption, fontWeight: '700' },
    specValue: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800', marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    primaryBtn: { flex: 1, minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md },
    primaryBtnWide: { marginTop: spacing.md },
    primaryBtnText: { color: colors.onPrimary, ...typography.bodySmall, fontWeight: '900' },
    ghostBtn: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
    ghostBtnText: { color: colors.primary, ...typography.bodySmall, fontWeight: '800' },
    removeLink: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xs },
    removeLinkText: { color: colors.danger, ...typography.caption, fontWeight: '800' },
    emptyText: { color: colors.textSecondary, ...typography.bodySmall, textAlign: 'center' },
    disabled: { opacity: 0.5 },
    reportCard: { borderWidth: border.thin },
    reportHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    reportTitle: { ...typography.body, fontWeight: '900' },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
    stepCopy: { flex: 1, minWidth: 0 },
    stepLabel: { color: colors.textPrimary, ...typography.bodySmall, fontWeight: '800' },
    stepDetail: { color: colors.textSecondary, ...typography.caption, lineHeight: 17, marginTop: 2 },
    reportTime: { color: colors.textMuted, ...typography.caption, marginTop: spacing.md },
    noticeCard: { backgroundColor: accents.blue.soft, borderColor: accents.blue.border },
    noticeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    noticeTitle: { color: accents.blue.on, ...typography.body, fontWeight: '900' },
    noticeBody: { color: colors.textSecondary, ...typography.caption, lineHeight: 18, marginTop: spacing.xs },
    freeIntro: { color: colors.textSecondary, ...typography.caption, lineHeight: 17, marginBottom: spacing.sm },
    freeName: { color: colors.textPrimary, ...typography.body, fontWeight: '900' },
    freeStrength: { color: colors.textSecondary, ...typography.caption, lineHeight: 17, marginTop: spacing.xxs },
    freeMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    freeMeta: { color: colors.textMuted, ...typography.caption, fontWeight: '700' },
    freeLinkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    freeLink: { flex: 1, color: colors.textMuted, ...typography.caption, fontFamily: typography.numeric.fontFamily },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: border.thin, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    copyBtnText: { color: colors.primary, ...typography.caption, fontWeight: '800' },
    howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.xs },
    howText: { flex: 1, color: colors.textSecondary, ...typography.bodySmall, lineHeight: 20 },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: border.thin, borderTopColor: colors.border },
    footer: { color: colors.textMuted, ...typography.caption },
    pressed: { opacity: 0.78 },
  });
}
