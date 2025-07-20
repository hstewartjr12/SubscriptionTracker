import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { MaterialIcons } from '@expo/vector-icons';
import { RFValue } from 'react-native-responsive-fontsize';
import { useNavigation } from '@react-navigation/native';
// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

interface ConsolidationGroup {
  category: string;
  services: any[];
  recommended: any;
  toCancel: any[];
  potentialSavings: number;
  overlapReason: string;
}

interface Suggestion {
  type: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  actionable: boolean;
  group?: ConsolidationGroup;
  subscription?: any;
}

const ConsolidationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Fetch consolidation data
  const consolidationData = useQuery(api.subscriptions.getConsolidationSuggestions);
  const overlapData = useQuery(api.subscriptions.getOverlapDetection);
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);

  const onRefresh = async () => {
    setRefreshing(true);
    // The query will automatically refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCancelSubscription = async (subscriptionId: string, name: string) => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(subscriptionId);
            try {
              await cancelSubscription({ id: subscriptionId as any });
              hapticFeedback.success();
              Alert.alert('Success', `${name} has been cancelled successfully`);
            } catch (error) {
              hapticFeedback.error();
              Alert.alert('Error', 'Failed to cancel subscription');
            } finally {
              setProcessingAction(null);
            }
          },
        },
      ]
    );
  };

  const renderOverlapGroup = (group: ConsolidationGroup, index: number) => {
    const totalMonthlySavings = group.potentialSavings;
    const totalYearlySavings = totalMonthlySavings * 12;

    return (
      <Card key={index} style={{ marginBottom: theme.spacing[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] }}>
          <MaterialIcons name="merge-type" size={24} color={theme.colors.secondary[500]} />
          <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing[2] }}>
            {group.category.charAt(0).toUpperCase() + group.category.slice(1)} Services
          </Text>
        </View>
        
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[4] }}>{group.overlapReason}</Text>
        
        <Card style={{ 
          backgroundColor: theme.colors.success[50], 
          borderColor: theme.colors.success[200],
          marginBottom: theme.spacing[4]
        }}>
          <Text variant="h5" weight="semibold" style={{ color: theme.colors.success[700], marginBottom: theme.spacing[1] }}>
            Potential Savings
          </Text>
          <Text variant="h3" weight="bold" style={{ color: theme.colors.success[700], marginBottom: theme.spacing[1] }}>
            ${(totalMonthlySavings / 100).toFixed(2)}/month
          </Text>
          <Text variant="body" color="secondary" style={{ color: theme.colors.success[600] }}>
            ${(totalYearlySavings / 100).toFixed(2)}/year
          </Text>
        </Card>

        <View style={{ marginBottom: theme.spacing[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] }}>
            <MaterialIcons name="star" size={20} color={theme.colors.warning[500]} />
            <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1] }}>Keep This</Text>
          </View>
          <Card style={{ borderColor: theme.colors.success[200], borderWidth: 1 }}>
            <Text variant="body" weight="semibold">{group.recommended.name}</Text>
            <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[1] }}>{group.recommended.provider}</Text>
            <Text variant="body" weight="semibold" style={{ color: theme.colors.primary[500], marginTop: theme.spacing[1] }}>
              ${(group.recommended.monthlyCost / 100).toFixed(2)}/month
            </Text>
            <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
              Usage: {group.recommended.usageFrequency || 'Unknown'}
            </Text>
          </Card>
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] }}>
            <MaterialIcons name="cancel" size={20} color={theme.colors.error[500]} />
            <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1] }}>Consider Cancelling</Text>
          </View>
          {group.toCancel.map((service, idx) => (
            <Card key={idx} style={{ 
              borderColor: theme.colors.error[200], 
              borderWidth: 1, 
              marginBottom: theme.spacing[2] 
            }}>
              <Text variant="body" weight="semibold">{service.name}</Text>
              <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[1] }}>{service.provider}</Text>
              <Text variant="body" weight="semibold" style={{ color: theme.colors.error[500], marginTop: theme.spacing[1] }}>
                ${(service.monthlyCost / 100).toFixed(2)}/month
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                Usage: {service.usageFrequency || 'Unknown'}
              </Text>
              <Button 
                variant="outline" 
                size="small"
                onPress={() => handleCancelSubscription(service._id, service.name)}
                disabled={processingAction === service._id}
                style={{ marginTop: theme.spacing[2] }}
              >
                {processingAction === service._id ? (
                  <ActivityIndicator color={theme.colors.error[500]} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="cancel" size={16} color={theme.colors.error[500]} />
                    <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1], color: theme.colors.error[500] }}>
                      Cancel
                    </Text>
                  </>
                )}
              </Button>
            </Card>
          ))}
        </View>
      </Card>
    );
  };

  const renderSuggestion = (suggestion: Suggestion, index: number) => {
    const getIconName = (iconName: string) => {
      switch (iconName) {
        case 'merge': return 'merge-type';
        case 'cancel': return 'cancel';
        case 'calendar': return 'calendar-today';
        case 'lightbulb': return 'lightbulb-outline';
        default: return 'info';
      }
    };

    return (
      <TouchableOpacity
        key={index}
        style={{ marginBottom: theme.spacing[3] }}
        onPress={() => {
          hapticFeedback.buttonPress();
          if (suggestion.group) {
            // Show detailed overlap group
            Alert.alert(
              suggestion.title,
              `${suggestion.message}\n\nRecommended: ${suggestion.group.recommended.name}\nTo cancel: ${suggestion.group.toCancel.map(s => s.name).join(', ')}`
            );
          } else if (suggestion.subscription) {
            // Handle individual subscription actions
            if (suggestion.type === 'unused') {
              handleCancelSubscription(suggestion.subscription._id, suggestion.subscription.name);
            } else {
              Alert.alert(suggestion.title, suggestion.message);
            }
          }
        }}
        activeOpacity={0.7}
      >
        <Card style={{ borderLeftWidth: 4, borderLeftColor: suggestion.color }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] }}>
            <MaterialIcons 
              name={getIconName(suggestion.icon)} 
              size={24} 
              color={suggestion.color} 
            />
            <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[2] }}>{suggestion.title}</Text>
          </View>
          <Text variant="body" color="secondary">{suggestion.message}</Text>
          {suggestion.actionable && (
            <Text variant="caption" style={{ color: suggestion.color, marginTop: theme.spacing[2] }}>
              Tap for actions
            </Text>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderSummary = () => {
    if (!consolidationData || !overlapData) return null;

    const totalSavings = consolidationData.totalPotentialSavings;
    const overlapCount = consolidationData.overlapCount;

    return (
      <Card style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>Consolidation Overview</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.primary[500], marginBottom: theme.spacing[2] }}>{overlapCount}</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Overlap Groups</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.success[500], marginBottom: theme.spacing[2] }}>
              ${(totalSavings / 100).toFixed(0)}
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Monthly Savings</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.warning[500], marginBottom: theme.spacing[2] }}>
              ${((totalSavings * 12) / 100).toFixed(0)}
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Yearly Savings</Text>
          </View>
        </View>
      </Card>
    );
  };

  if (!consolidationData || !overlapData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary[500]} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.secondary[500]} />
          <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[3] }}>
            Loading consolidation data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary[500]} />
      
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: theme.spacing[5], 
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.light,
        backgroundColor: theme.colors.background.card
      }}>
        <TouchableOpacity onPress={() => { hapticFeedback.buttonPress(); navigation.goBack(); }} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing[3] }}>Consolidation</Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        <View style={{ padding: theme.spacing[5] }}>
          {renderSummary()}

          {/* Consolidation Suggestions */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Consolidation Suggestions</Text>
            {consolidationData.suggestions.map((suggestion, index) => 
              renderSuggestion(suggestion, index)
            )}
          </View>

          {/* Overlap Groups */}
          {(overlapData as any).groups && (overlapData as any).groups.length > 0 && (
            <View style={{ marginBottom: theme.spacing[5] }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Service Overlaps</Text>
              {(overlapData as any).groups.map((group, index) => 
                renderOverlapGroup(group, index)
              )}
            </View>
          )}

          {/* No Consolidation Opportunities */}
          {consolidationData.suggestions.length === 0 && (!(overlapData as any).groups || (overlapData as any).groups.length === 0) && (
            <Card>
              <View style={{ padding: theme.spacing[10], alignItems: 'center' }}>
                <MaterialIcons name="check-circle" size={48} color={theme.colors.success[500]} />
                <Text variant="h5" weight="semibold" style={{ marginTop: theme.spacing[3], color: theme.colors.success[700] }}>
                  Great Job!
                </Text>
                <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[2], textAlign: 'center' }}>
                  No consolidation opportunities found. Your subscriptions are well-optimized!
                </Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});

export default ConsolidationScreen; 