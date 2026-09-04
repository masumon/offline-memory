import { FlexWidget, TextWidget } from 'react-native-android-widget';

// A small home-screen widget: the app name and two buttons that deep-link straight into
// the task / memory editor. Rendering happens in a headless JS context (see
// widget-task-handler), so this component must stay self-contained — no hooks, no
// context, no data access. The palette mirrors the app's dark theme tokens.

export function QuickAddWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#161C2B',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text="Offline Memory" style={{ fontSize: 13, fontWeight: 'bold', color: '#EFF2FA' }} />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'offlinememory://task-editor' }}
          style={{ flex: 1, marginRight: 6, paddingTop: 10, paddingBottom: 10, borderRadius: 12, backgroundColor: '#7AA2FF', alignItems: 'center', justifyContent: 'center' }}
        >
          <TextWidget text="＋ Task" style={{ fontSize: 14, fontWeight: 'bold', color: '#07122A' }} />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'offlinememory://memory-editor' }}
          style={{ flex: 1, marginLeft: 6, paddingTop: 10, paddingBottom: 10, borderRadius: 12, backgroundColor: '#1F2637', alignItems: 'center', justifyContent: 'center' }}
        >
          <TextWidget text="＋ Memory" style={{ fontSize: 14, fontWeight: 'bold', color: '#EFF2FA' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
