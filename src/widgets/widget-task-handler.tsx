import type { ReactElement } from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickAddWidget } from './QuickAddWidget';

// Headless entry point for the home-screen widget. Android calls this when a widget is
// added, refreshed or resized; we just re-render the static layout. Clicks use the
// library's built-in OPEN_URI action and never reach here.

const WIDGETS: Record<string, () => ReactElement> = {
  QuickAdd: QuickAddWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const Widget = WIDGETS[props.widgetInfo.widgetName];
  if (!Widget) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<Widget />);
      break;
    default:
      break;
  }
}
