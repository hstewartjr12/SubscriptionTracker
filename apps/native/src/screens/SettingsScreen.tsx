import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';

// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

export default function SettingsScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Get current settings
  const settings = useQuery(api.subscriptions.getSettings);
  
  // Local state for toggles
  const [renewalReminders, setRenewalReminders] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [showCostInCents, setShowCostInCents] = useState(false);
  
  // Update settings mutation
  const updateSettings = useMutation(api.subscriptions.updateSettings);
  
  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setRenewalReminders(settings.renewalReminders);
      setBudgetAlerts(settings.budgetAlerts);
      setShowCostInCents(settings.showCostInCents);
    }
  }, [settings]);
  
  // Handle toggle changes
  const handleToggleChange = async (
    setting: 'renewalReminders' | 'budgetAlerts' | 'showCostInCents',
    value: boolean
  ) => {
    setIsLoading(true);
    
    try {
      const updateData: any = {};
      updateData[setting] = value;
      
      await updateSettings(updateData);
      
      // Update local state
      switch (setting) {
        case 'renewalReminders':
          setRenewalReminders(value);
          break;
        case 'budgetAlerts':
          setBudgetAlerts(value);
          break;
        case 'showCostInCents':
          setShowCostInCents(value);
          break;
      }
      
      // Show success feedback
      Alert.alert(
        'Settings Updated',
        `${setting === 'renewalReminders' ? 'Renewal reminders' : 
          setting === 'budgetAlerts' ? 'Budget alerts' : 
          'Cost display'} ${value ? 'enabled' : 'disabled'}.`
      );
      
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (settings === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.buttonPress();
            navigation.goBack();
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Settings Section */}
      <Card variant="elevated" style={styles.section}>
        <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Notifications</Text>
        
        {/* Renewal Reminders Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={24} color={theme.colors.primary[500]} />
            <View style={styles.settingText}>
              <Text variant="body" weight="medium" style={styles.settingTitle}>Renewal Reminders</Text>
              <Text variant="body2" color="secondary" style={styles.settingDescription}>
                Get notified before subscriptions renew
              </Text>
            </View>
          </View>
          <Switch
            value={renewalReminders}
            onValueChange={(value) => {
              hapticFeedback.toggle();
              handleToggleChange('renewalReminders', value);
            }}
            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
            thumbColor={renewalReminders ? '#FFFFFF' : '#FFFFFF'}
            disabled={isLoading}
          />
        </View>
        
        {/* Budget Alerts Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="warning" size={24} color={theme.colors.warning[500]} />
            <View style={styles.settingText}>
              <Text variant="body" weight="medium" style={styles.settingTitle}>Budget Alerts</Text>
              <Text variant="body2" color="secondary" style={styles.settingDescription}>
                Alert when spending exceeds budget
              </Text>
            </View>
          </View>
          <Switch
            value={budgetAlerts}
            onValueChange={(value) => {
              hapticFeedback.toggle();
              handleToggleChange('budgetAlerts', value);
            }}
            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
            thumbColor={budgetAlerts ? '#FFFFFF' : '#FFFFFF'}
            disabled={isLoading}
          />
        </View>
      </Card>
      
      {/* Display Section */}
      <Card variant="elevated" style={styles.section}>
        <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Display</Text>
        
        {/* Show Cost in Cents Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="calculator" size={24} color={theme.colors.success[500]} />
            <View style={styles.settingText}>
              <Text variant="body" weight="medium" style={styles.settingTitle}>Show Cost in Cents</Text>
              <Text variant="body2" color="secondary" style={styles.settingDescription}>
                Display costs with cents (e.g., $9.99 instead of $10)
              </Text>
            </View>
          </View>
          <Switch
            value={showCostInCents}
            onValueChange={(value) => {
              hapticFeedback.toggle();
              handleToggleChange('showCostInCents', value);
            }}
            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
            thumbColor={showCostInCents ? '#FFFFFF' : '#FFFFFF'}
            disabled={isLoading}
          />
        </View>
      </Card>
      
      {/* Export Section */}
      <Card variant="elevated" style={styles.section}>
        <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Data & Export</Text>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            hapticFeedback.buttonPress();
            navigation.navigate("ExportScreen");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.exportButtonInfo}>
            <Ionicons name="download-outline" size={24} color={theme.colors.primary[500]} />
            <View style={styles.exportButtonText}>
              <Text variant="body" weight="medium" style={styles.exportButtonTitle}>Export Data</Text>
              <Text variant="body2" color="secondary" style={styles.exportButtonDescription}>
                Export subscriptions, analytics, and usage data as CSV
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </Card>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Card variant="outlined" style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info[500]} />
          <Text variant="body2" color="primary" style={styles.infoText}>
            Settings are automatically saved and synced across your devices.
          </Text>
        </Card>
      </View>
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingOverlayText}>Updating...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  loadingText: {
    marginTop: theme.spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[5],
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  backButton: {
    padding: theme.spacing[2],
  },
  headerTitle: {
    // Styling handled by Text component
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginTop: theme.spacing[5],
    marginHorizontal: theme.spacing[5],
    padding: theme.spacing[5],
  },
  sectionTitle: {
    marginBottom: theme.spacing[4],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing[4],
  },
  settingText: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  settingTitle: {
    marginBottom: theme.spacing[0.5],
  },
  settingDescription: {
    // Styling handled by Text component
  },
  infoSection: {
    marginTop: theme.spacing[5],
    marginHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[10],
  },
  infoCard: {
    padding: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#FFFFFF',
    marginTop: theme.spacing[3],
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  exportButtonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exportButtonText: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  exportButtonTitle: {
    marginBottom: theme.spacing[0.5],
  },
  exportButtonDescription: {
    // Styling handled by Text component
  },
}); 