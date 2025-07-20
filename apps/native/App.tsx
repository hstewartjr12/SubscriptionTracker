import React, { Suspense, useMemo } from "react";
import { View, StatusBar, Platform, LogBox } from "react-native";
import { useFonts } from "expo-font";
import Navigation from "./src/navigation/Navigation";
import ConvexClientProvider from "./ConvexClientProvider";
import { Text } from "./src/components/ui";

// Ignore specific warnings that are not critical
LogBox.ignoreLogs([
  "Warning: ...",
  "Non-serializable values were found in the navigation state",
  "AsyncStorage has been extracted from react-native",
]);

// Disable all logs in production
if (__DEV__ === false) {
  LogBox.ignoreAllLogs();
}

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff'
  }}>
    <Text variant="h6" color="secondary">Loading...</Text>
  </View>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: 20
        }}>
          <Text variant="h5" color="error" style={{ textAlign: 'center', marginBottom: 16 }}>
            Something went wrong
          </Text>
          <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
            Please restart the app or contact support if the problem persists.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [loaded] = useFonts({
    Bold: require("./src/assets/fonts/Inter-Bold.ttf"),
    SemiBold: require("./src/assets/fonts/Inter-SemiBold.ttf"),
    Medium: require("./src/assets/fonts/Inter-Medium.ttf"),
    Regular: require("./src/assets/fonts/Inter-Regular.ttf"),

    MBold: require("./src/assets/fonts/Montserrat-Bold.ttf"),
    MSemiBold: require("./src/assets/fonts/Montserrat-SemiBold.ttf"),
    MMedium: require("./src/assets/fonts/Montserrat-Medium.ttf"),
    MRegular: require("./src/assets/fonts/Montserrat-Regular.ttf"),
    MLight: require("./src/assets/fonts/Montserrat-Light.ttf"),
  });

  // Memoize status bar height calculation
  const statusBarHeight = useMemo(() => {
    return Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 0;
  }, []);

  // Show loading screen while fonts are loading
  if (!loaded) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <Text variant="h6" color="secondary">Loading fonts...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ConvexClientProvider>
        <Suspense fallback={<LoadingFallback />}>
          <View style={{ flex: 1 }}>
            <View style={{ 
              height: statusBarHeight, 
              backgroundColor: "#0D87E1" 
            }}>
              <StatusBar
                translucent
                backgroundColor={"#0D87E1"}
                barStyle="light-content"
              />
            </View>
            <Navigation />
          </View>
        </Suspense>
      </ConvexClientProvider>
    </ErrorBoundary>
  );
}
