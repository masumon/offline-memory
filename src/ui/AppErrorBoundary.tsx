import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

// Last line of defence: if a screen throws during render, the user gets a calm recovery
// card instead of a white screen or a hard crash. "Try again" remounts the subtree;
// "Copy details" hands them the stack so they can paste it into a bug report. No network,
// nothing logged anywhere off-device. Colours are hard-coded (theme context may be the
// thing that broke) and read fine on any background.

type Props = { children: ReactNode };
type State = { error: Error | null; info: string };

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' });
  }

  private reset = () => this.setState({ error: null, info: '' });

  private dump = () => {
    const { error, info } = this.state;
    return [
      `Offline Memory — error report`,
      new Date().toISOString(),
      '',
      String(error?.stack ?? error?.message ?? error),
      '',
      info,
    ].join('\n');
  };

  private copy = () => {
    void Clipboard.setStringAsync(this.dump()).catch(() => {});
  };

  private save = () => {
    void (async () => {
      try {
        const file = new File(Paths.cache, `offline-memory-error-${Date.now()}.txt`);
        file.create({ overwrite: true });
        file.write(this.dump());
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Offline Memory error report' });
      } catch { /* best-effort — Copy details is the fallback */ }
    })();
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.badge}><Text style={styles.badgeText}>!</Text></View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The screen hit an error. Your tasks and memories are safe on this device — nothing was lost.
          </Text>
          <Text style={styles.mono} numberOfLines={4}>{String(error.message || error)}</Text>
          <Pressable accessibilityRole="button" onPress={this.reset} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={this.copy} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Copy error details</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={this.save} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Save report to a file</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1013' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2A1416', borderWidth: 1, borderColor: '#5A2A2E', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#F0736A', fontSize: 26, fontWeight: '800' },
  title: { color: '#EDEEF2', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: '#A7ADB8', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 420 },
  mono: { color: '#7E8695', fontSize: 12, lineHeight: 17, fontFamily: 'monospace', textAlign: 'center', maxWidth: 420, marginVertical: 6 },
  primary: { minHeight: 48, alignSelf: 'stretch', maxWidth: 320, borderRadius: 14, backgroundColor: '#5B4BE6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondary: { minHeight: 48, alignSelf: 'stretch', maxWidth: 320, borderRadius: 14, borderWidth: 1, borderColor: '#2C313B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryText: { color: '#C4CAD4', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
