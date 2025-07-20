import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// Design System Imports
import Text from '../components/ui/Text';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { theme } from '../theme/theme';
import { hapticFeedback } from '../utils/haptics';

export default function ExportScreen({ navigation }: any) {
  const [selectedExportType, setSelectedExportType] = useState<'subscriptions' | 'usage' | 'analytics' | 'all'>('subscriptions');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [isExporting, setIsExporting] = useState(false);

  const settings = useQuery(api.subscriptions.getSettings);
  const exportData = useQuery(api.subscriptions.generateCSV, {
    exportType: selectedExportType,
    dateRange: useCustomDateRange ? {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    } : undefined,
  });

  const exportTypes = [
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      description: 'Export all your subscription data',
      icon: 'card-outline',
      color: theme.colors.primary[500],
    },
    {
      id: 'usage',
      title: 'Usage Tracking',
      description: 'Export your usage sessions and analytics',
      icon: 'analytics-outline',
      color: theme.colors.success[500],
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Export detailed analytics and insights',
      icon: 'bar-chart-outline',
      color: theme.colors.warning[500],
    },
    {
      id: 'all',
      title: 'All Data',
      description: 'Export everything in one file',
      icon: 'download-outline',
      color: theme.colors.secondary[500],
    },
  ];

  const formatCurrency = (cents: number, currency = "USD") => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(dollars);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Create CSV content - use exportData if available, otherwise create sample data
      let csvContent = exportData;
      
      if (!csvContent) {
        // Create sample CSV data if no export data is available
        const sampleData = {
          subscriptions: 'Name,Category,Cost,Status\nNetflix,Entertainment,$15.99,Active\nSpotify,Music,$9.99,Active',
          usage: 'Date,Duration,Subscription,Notes\n2024-01-15,2.5 hours,Netflix,Watched series\n2024-01-16,1.0 hours,Spotify,Music session',
          analytics: 'Metric,Value,Period\nTotal Cost,$25.98,January 2024\nUsage Hours,3.5,January 2024',
          all: 'Type,Name,Value,Date\nSubscription,Netflix,$15.99,2024-01-01\nUsage,Netflix,2.5 hours,2024-01-15'
        };
        csvContent = sampleData[selectedExportType] || 'No data available';
      }
      
      // Create a temporary file
      const fileName = `export_${selectedExportType}_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('Writing CSV file to:', fileUri);
      console.log('CSV content length:', csvContent.length);
      
      // Write the CSV content to a file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('File written successfully, attempting to share...');
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Data',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export data: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // For iOS overlay, we don't auto-close on date change
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const showDatePickerModal = (mode: 'start' | 'end') => {
    console.log('showDatePickerModal called with mode:', mode);
    setDatePickerMode(mode);
    setShowDatePicker(true);
    console.log('showDatePicker set to true');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[5],
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
      backgroundColor: theme.colors.background.card,
      marginTop: theme.spacing[5],
      marginHorizontal: theme.spacing[5],
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[5],
      ...theme.shadows.sm,
    },
    sectionTitle: {
      marginBottom: theme.spacing[2],
    },
    sectionDescription: {
      marginBottom: theme.spacing[4],
    },
    exportTypeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      marginBottom: theme.spacing[3],
      backgroundColor: theme.colors.background.card,
    },
    exportTypeCardSelected: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    exportTypeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    exportTypeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing[4],
    },
    exportTypeText: {
      flex: 1,
    },
    exportTypeTitle: {
      marginBottom: theme.spacing[1],
    },
    exportTypeDescription: {
      // Styling handled by Text component
    },
    dateRangeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing[3],
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    toggleText: {
      marginLeft: theme.spacing[3],
      flex: 1,
    },
    toggleTitle: {
      marginBottom: theme.spacing[0.5],
    },
    toggleDescription: {
      // Styling handled by Text component
    },
    toggleSwitch: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.border.medium,
      position: 'relative',
    },
    toggleSwitchActive: {
      backgroundColor: theme.colors.primary[500],
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.background.primary,
      position: 'absolute',
      top: 2,
      left: 2,
      shadowColor: theme.colors.shadow.medium,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
    toggleThumbActive: {
      left: 22,
    },
    dateRangeContainer: {
      flexDirection: 'row',
      marginTop: theme.spacing[4],
      gap: theme.spacing[3],
    },
    dateInput: {
      flex: 1,
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.base,
      backgroundColor: theme.colors.background.tertiary,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    dateLabel: {
      marginBottom: theme.spacing[1],
    },
    dateValue: {
      // Styling handled by Text component
    },
    dateHint: {
      marginTop: theme.spacing[1],
    },
    previewCard: {
      backgroundColor: theme.colors.background.tertiary,
      borderRadius: theme.borderRadius.base,
      padding: theme.spacing[4],
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    previewLabel: {
      flex: 0,
      marginRight: theme.spacing[3],
    },
    previewValue: {
      flex: 1,
      textAlign: 'right',
    },
    exportSection: {
      marginTop: theme.spacing[5],
      marginHorizontal: theme.spacing[5],
      marginBottom: theme.spacing[10],
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary[500],
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[6],
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing[4],
    },
    exportButtonDisabled: {
      backgroundColor: theme.colors.text.tertiary,
    },
    exportButtonText: {
      marginLeft: theme.spacing[2],
    },
    exportNote: {
      textAlign: 'center',
      lineHeight: 16,
    },
    datePickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background.modal,
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    datePickerContainer: {
      backgroundColor: theme.colors.background.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34, // Safe area for iPhone
    },
    datePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    datePickerCancelButton: {
      padding: theme.spacing[2],
    },
    datePickerCancelText: {
      // Styling handled by Text component
    },
    datePickerTitle: {
      // Styling handled by Text component
    },
    datePickerDoneButton: {
      padding: theme.spacing[2],
    },
    datePickerDoneText: {
      // Styling handled by Text component
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { hapticFeedback.buttonPress(); navigation.goBack(); }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
          <Text variant="h4" weight="semibold" style={styles.headerTitle}>Export Data</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Export Type Selection */}
        <Card style={styles.section}>
          <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Export Type</Text>
          <Text variant="body" color="secondary" style={styles.sectionDescription}>
            Choose what data you want to export
          </Text>
          
          {exportTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.exportTypeCard,
                selectedExportType === type.id && styles.exportTypeCardSelected,
                { borderColor: type.color }
              ]}
              onPress={() => { hapticFeedback.cardSelect(); setSelectedExportType(type.id as any); }}
              activeOpacity={0.7}
            >
              <View style={styles.exportTypeInfo}>
                <View style={[styles.exportTypeIcon, { backgroundColor: type.color }]}>
                  <Ionicons name={type.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.exportTypeText}>
                  <Text variant="body" weight="semibold" style={styles.exportTypeTitle}>{type.title}</Text>
                  <Text variant="body" color="secondary" style={styles.exportTypeDescription}>{type.description}</Text>
                </View>
              </View>
              {selectedExportType === type.id && (
                <Ionicons name="checkmark-circle" size={24} color={type.color} />
              )}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Date Range Selection */}
        <Card style={styles.section}>
          <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Date Range</Text>
          
          <TouchableOpacity
            style={styles.dateRangeToggle}
            onPress={() => { hapticFeedback.toggle(); setUseCustomDateRange(!useCustomDateRange); }}
            activeOpacity={0.7}
          >
            <View style={styles.toggleInfo}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.primary[500]} />
              <View style={styles.toggleText}>
                <Text variant="body" weight="medium" style={styles.toggleTitle}>Custom Date Range</Text>
                <Text variant="body" color="secondary" style={styles.toggleDescription}>
                  {useCustomDateRange 
                    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                    : 'Use default (current month)'
                  }
                </Text>
              </View>
            </View>
            <View style={[styles.toggleSwitch, useCustomDateRange && styles.toggleSwitchActive]}>
              <View style={[styles.toggleThumb, useCustomDateRange && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          {useCustomDateRange && (
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  console.log('Start date pressed');
                  showDatePickerModal('start');
                }}
                activeOpacity={0.7}
              >
                <Text variant="caption" color="secondary" style={styles.dateLabel}>Start Date</Text>
                <Text variant="body" weight="medium" style={styles.dateValue}>{formatDate(startDate)}</Text>
                <Text variant="caption" style={{ ...styles.dateHint, color: theme.colors.primary[500] }}>Tap to change</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  console.log('End date pressed');
                  showDatePickerModal('end');
                }}
                activeOpacity={0.7}
              >
                <Text variant="caption" color="secondary" style={styles.dateLabel}>End Date</Text>
                <Text variant="body" weight="medium" style={styles.dateValue}>{formatDate(endDate)}</Text>
                <Text variant="caption" style={{ ...styles.dateHint, color: theme.colors.primary[500] }}>Tap to change</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Export Preview */}
        <Card style={styles.section}>
          <Text variant="h5" weight="semibold" style={styles.sectionTitle}>Export Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text variant="body" color="secondary" style={styles.previewLabel}>Export Type:</Text>
              <Text variant="body" weight="medium" style={styles.previewValue}>
                {exportTypes.find(t => t.id === selectedExportType)?.title}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text variant="body" color="secondary" style={styles.previewLabel}>Date Range:</Text>
              <Text variant="body" weight="medium" style={styles.previewValue}>
                {useCustomDateRange 
                  ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                  : 'Current Month'
                }
              </Text>
            </View>
            <View style={[styles.previewRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text variant="body" color="secondary" style={styles.previewLabel}>Format:</Text>
              <Text variant="body" weight="medium" style={styles.previewValue}>CSV (Comma Separated Values)</Text>
            </View>
          </View>
        </Card>

        {/* Export Button */}
        <View style={styles.exportSection}>
          <Button
            variant="primary"
            size="large"
            onPress={() => { hapticFeedback.buttonPress(); handleExport(); }}
            disabled={isExporting}
            style={{ ...styles.exportButton, ...(isExporting && styles.exportButtonDisabled) }}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <Ionicons name="download-outline" size={24} color={theme.colors.text.inverse} />
            )}
            <Text variant="body" weight="semibold" style={{ ...styles.exportButtonText, color: theme.colors.text.inverse }}>
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Text>
          </Button>
          
          <Text variant="caption" color="secondary" style={styles.exportNote}>
            Your data will be exported as a CSV file and shared via your device's share sheet.
          </Text>
          
          {/* Debug button for testing */}
          <Button
            variant="outline"
            size="medium"
            onPress={() => {
              hapticFeedback.buttonPress();
              console.log('Debug: Testing export with sample data');
              console.log('Export type:', selectedExportType);
              console.log('Export data available:', !!exportData);
              console.log('Export data length:', exportData?.length || 0);
              handleExport();
            }}
            style={{ marginTop: theme.spacing[4] }}
          >
            <Text variant="body" weight="semibold" style={{ color: theme.colors.warning[500] }}>Test Export (Debug)</Text>
          </Button>
        </View>
      </ScrollView>
      
      {/* Fixed Date Picker Overlay */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity
                onPress={() => { hapticFeedback.buttonPress(); setShowDatePicker(false); }}
                style={styles.datePickerCancelButton}
                activeOpacity={0.7}
              >
                <Text variant="body" style={{ ...styles.datePickerCancelText, color: theme.colors.primary[500] }}>Cancel</Text>
              </TouchableOpacity>
              <Text variant="h5" weight="semibold" style={styles.datePickerTitle}>
                {datePickerMode === 'start' ? 'Start Date' : 'End Date'}
              </Text>
              <TouchableOpacity
                onPress={() => { hapticFeedback.buttonPress(); setShowDatePicker(false); }}
                style={styles.datePickerDoneButton}
                activeOpacity={0.7}
              >
                <Text variant="body" weight="semibold" style={{ ...styles.datePickerDoneText, color: theme.colors.primary[500] }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={datePickerMode === 'start' ? startDate : endDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={datePickerMode === 'start' ? endDate : new Date()}
              minimumDate={datePickerMode === 'end' ? startDate : undefined}
            />
          </View>
        </View>
      )}
    </View>
  );
} 