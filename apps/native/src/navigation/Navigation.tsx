import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import SubscriptionDashboardScreen from "../screens/NotesDashboardScreen";
import SubscriptionDetailScreen from "../screens/InsideNoteScreen";
import CreateSubscriptionScreen from "../screens/CreateNoteScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import ConsolidationScreen from "../screens/ConsolidationScreen";
import UsageTrackingScreen from "../screens/UsageTrackingScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ExportScreen from "../screens/ExportScreen";
import TemplateLibraryScreen from "../screens/TemplateLibraryScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="LoginScreen"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen
          name="SubscriptionDashboardScreen"
          component={SubscriptionDashboardScreen}
        />
        <Stack.Screen name="SubscriptionDetailScreen" component={SubscriptionDetailScreen} />
        <Stack.Screen name="CreateSubscriptionScreen" component={CreateSubscriptionScreen} />
        <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
        <Stack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
        <Stack.Screen name="ConsolidationScreen" component={ConsolidationScreen} />
        <Stack.Screen name="UsageTrackingScreen" component={UsageTrackingScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="ExportScreen" component={ExportScreen} />
        <Stack.Screen name="TemplateLibraryScreen" component={TemplateLibraryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
