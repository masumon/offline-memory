import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// The home-screen widget renders in a headless JS task; its handler has to be registered
// at the JS entry point, before the router mounts.
registerWidgetTaskHandler(widgetTaskHandler);
