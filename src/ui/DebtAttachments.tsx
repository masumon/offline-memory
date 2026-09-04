// Attachment strip for a debt account or a ledger row. Self-contained: it loads,
// adds and removes its own rows so any debt screen can drop it in with two props.

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from './AppText';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppConfirmDialog, useAppFeedback } from './AppFeedback';
import { AppIcon, type IconName } from './AppIcon';
import { Card, useDebt } from './DebtKit';
import { success, tapLight, warn } from './haptics';
import {
  addDebtAttachments, formatFileSize, listDebtAttachments, openDebtAttachment, removeDebtAttachment,
  type DebtAttachment, type DebtAttachmentOwner,
} from '../services/debt/attachments';
import { icon, spacing } from '../theme';

function iconFor(mime: string, name: string): IconName {
  const n = name.toLowerCase();
  if (mime.startsWith('image/')) return 'image-outline';
  if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'file-pdf-box';
  if (/sheet|excel|csv/.test(mime) || /\.(xlsx?|csv)$/.test(n)) return 'file-table-outline';
  if (mime.startsWith('audio/')) return 'music-note-outline';
  if (mime.startsWith('video/')) return 'video-outline';
  return 'file-outline';
}

export function DebtAttachments({ ownerType, ownerId }: { ownerType: DebtAttachmentOwner; ownerId: string }) {
  const db = useSQLiteContext();
  const { s, c, bn, colors, accents } = useDebt();
  const { showSnackbar } = useAppFeedback();

  const [items, setItems] = useState<DebtAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<DebtAttachment | null>(null);

  const load = useCallback(async () => {
    try { setItems(await listDebtAttachments(db, ownerType, ownerId)); }
    catch { setItems([]); }
  }, [db, ownerType, ownerId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const added = await addDebtAttachments(db, ownerType, ownerId);
      if (added.length) { success(); await load(); }
    } catch (e) {
      warn();
      showSnackbar(e instanceof Error ? e.message : (bn ? 'যোগ করা গেল না' : 'Could not attach'), 'danger');
    } finally { setBusy(false); }
  };

  const open = async (a: DebtAttachment) => {
    tapLight();
    try {
      if (!(await openDebtAttachment(a.uri, a.mimeType))) showSnackbar(c.openFailed, 'danger');
    } catch { warn(); showSnackbar(c.openFailed, 'danger'); }
  };

  const confirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (!target) return;
    try {
      await removeDebtAttachment(db, target.id);
      success();
      await load();
    } catch { warn(); showSnackbar(bn ? 'সরানো গেল না' : 'Could not remove', 'danger'); }
  };

  return (
    <Card title={`${c.attachments}${items.length ? ` · ${items.length}` : ''}`}>
      <Text style={s.listMeta}>{c.attachmentHint}</Text>

      {items.length === 0 ? (
        <Text style={[s.statLabel, { marginTop: spacing.sm }]}>{c.noAttachments}</Text>
      ) : items.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          accessibilityLabel={a.name}
          onPress={() => void open(a)}
          onLongPress={() => setPendingRemove(a)}
          accessibilityHint={bn ? 'সরাতে চেপে ধরুন' : 'Long-press to remove'}
          style={({ pressed }) => StyleSheet.flatten([s.listRow, { marginTop: spacing.xs }, pressed && s.pressed])}
        >
          <AppIcon name={iconFor(a.mimeType, a.name)} size={icon.md} color={accents.blue.on} />
          <View style={s.grow}>
            <Text numberOfLines={1} style={s.listTitle}>{a.name}</Text>
            <Text numberOfLines={1} style={s.listMeta}>{formatFileSize(a.size)}{a.size ? ' · ' : ''}{a.createdAt.slice(0, 10)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.removeAttachment}
            onPress={() => setPendingRemove(a)}
            hitSlop={8}
            style={({ pressed }) => StyleSheet.flatten([pressed && s.pressed])}
          >
            <AppIcon name="close" size={icon.sm} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void add()}
        style={({ pressed }) => StyleSheet.flatten([s.ghost, { marginTop: spacing.sm }, busy && s.disabled, pressed && s.pressed])}
      >
        <AppIcon name="paperclip" size={icon.sm} color={colors.primary} />
        <Text style={s.ghostText}>{c.addAttachment}</Text>
      </Pressable>

      <AppConfirmDialog
        visible={pendingRemove !== null}
        title={c.removeAttachmentAsk}
        description={pendingRemove?.name}
        confirmLabel={c.removeAttachment}
        cancelLabel={c.cancel}
        danger
        icon="alert"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemove(null)}
      />
    </Card>
  );
}
