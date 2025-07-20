import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { MaterialIcons, AntDesign, Feather } from "@expo/vector-icons";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

const { width } = Dimensions.get("window");

export default function SubscriptionDetailScreen({ route, navigation }) {
  const { subscription } = route.params;
  const [activeTab, setActiveTab] = useState("overview");
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const updateUsage = useMutation(api.subscriptions.updateUsage);
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);
  const deleteSubscription = useMutation(api.subscriptions.deleteSubscription);
  
  // Usage tracking mutations
  const startSession = useMutation(api.subscriptions.startUsageSession);
  const endSession = useMutation(api.subscriptions.endUsageSession);
  const logSession = useMutation(api.subscriptions.logUsageSession);
  const deleteSession = useMutation(api.subscriptions.deleteUsageSession);
  
  // Usage tracking queries
  const usageAnalytics = useQuery(api.subscriptions.getUsageAnalytics, { subscriptionId: subscription._id });
  const recentSessions = useQuery(api.subscriptions.getUsageSessions, { subscriptionId: subscription._id });
  const usageGoals = useQuery(api.subscriptions.getUsageGoals, { subscriptionId: subscription._id });
  
  // Usage tracking state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // Log session form state
  const [logDuration, setLogDuration] = useState('');
  const [logActivities, setLogActivities] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logSatisfaction, setLogSatisfaction] = useState(0);
  const [logProductivity, setLogProductivity] = useState(0);
  const [logDevice, setLogDevice] = useState('');
  const [logLocation, setLogLocation] = useState('');
  
  // Rating modal state
  const [sessionSatisfaction, setSessionSatisfaction] = useState(0);
  const [sessionProductivity, setSessionProductivity] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionActivities, setSessionActivities] = useState('');
  
  // Goal modal state
  const [goalType, setGoalType] = useState('hours_per_month');
  const [goalTarget, setGoalTarget] = useState('');
  const setGoal = useMutation(api.subscriptions.setUsageGoal);

  const formatCurrency = (cents, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  };

  const getCategoryData = (category) => {
    const categoryMap = {
      entertainment: { name: "Entertainment", icon: "tv", color: theme.colors.error[500] },
      productivity: { name: "Productivity", icon: "work", color: theme.colors.secondary[500] },
      gaming: { name: "Gaming", icon: "sports-esports", color: theme.colors.info[500] },
      education: { name: "Education", icon: "school", color: theme.colors.success[500] },
      health: { name: "Health", icon: "favorite", color: theme.colors.warning[500] },
      finance: { name: "Finance", icon: "account-balance", color: "#DDA0DD" },
      utilities: { name: "Utilities", icon: "electrical-services", color: "#98D8C8" },
      news: { name: "News", icon: "article", color: "#F7DC6F" },
      social: { name: "Social", icon: "people", color: "#BB8FCE" },
      other: { name: "Other", icon: "category", color: theme.colors.neutral[500] },
    };
    return categoryMap[category] || categoryMap.other;
  };

  const getUsageColor = (frequency) => {
    const colorMap = {
      daily: theme.colors.success[500],
      weekly: theme.colors.primary[500], 
      monthly: theme.colors.warning[500],
      rarely: theme.colors.error[500],
      never: theme.colors.neutral[500]
    };
    return colorMap[frequency] || theme.colors.neutral[500];
  };

  const calculateMonthlyCost = () => {
    switch (subscription.billingCycle) {
      case "weekly": return subscription.cost * 4.33;
      case "monthly": return subscription.cost;
      case "quarterly": return subscription.cost / 3;
      case "biannual": return subscription.cost / 6;
      case "yearly": return subscription.cost / 12;
      default: return subscription.cost;
    }
  };

  const handleUsageUpdate = async (frequency) => {
    try {
      await updateUsage({
        id: subscription._id,
        usageFrequency: frequency
      });
      setShowUsageModal(false);
      hapticFeedback.success();
    } catch (error) {
      Alert.alert("Error", "Failed to update usage. Please try again.");
      hapticFeedback.error();
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription({ id: subscription._id });
              hapticFeedback.success();
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel subscription.");
              hapticFeedback.error();
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubscription = () => {
    Alert.alert(
      "Delete Subscription",
      "Are you sure you want to permanently delete this subscription? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubscription({ id: subscription._id });
              hapticFeedback.success();
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete subscription.");
              hapticFeedback.error();
            }
          },
        },
      ]
    );
  };

  const usageOptions = [
    { id: "daily", name: "Daily", description: "I use this every day" },
    { id: "weekly", name: "Weekly", description: "I use this weekly" },
    { id: "monthly", name: "Monthly", description: "I use this monthly" },
    { id: "rarely", name: "Rarely", description: "I rarely use this" },
    { id: "never", name: "Never", description: "I never use this" },
  ];

  const managementOptions = [
    {
      id: "edit",
      name: "Edit Subscription",
      icon: "edit",
      color: theme.colors.primary[500],
      action: () => {
        setShowManageModal(false);
        // Navigate to edit screen
      },
    },
    {
      id: "usage",
      name: "Update Usage",
      icon: "trending-up",
      color: theme.colors.success[500],
      action: () => {
        setShowManageModal(false);
        setShowUsageModal(true);
      },
    },
    {
      id: "cancel",
      name: "Cancel Subscription",
      icon: "pause-circle-outline",
      color: theme.colors.warning[500],
      action: () => {
        setShowManageModal(false);
        handleCancelSubscription();
      },
    },
    {
      id: "delete",
      name: "Delete Subscription",
      icon: "delete-outline",
      color: theme.colors.error[500],
      action: () => {
        setShowManageModal(false);
        handleDeleteSubscription();
      },
    },
  ];

  // Usage tracking handlers
  const handleStartSession = async () => {
    try {
      const sessionId = await startSession({ 
        subscriptionId: subscription._id,
        sessionType: 'manual'
      });
      setActiveSessionId(sessionId);
      setSessionStartTime(Date.now());
      hapticFeedback.success();
      Alert.alert('Success', 'Session started successfully');
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSessionId) return;
    setShowRatingModal(true);
  };

  const handleConfirmEndSession = async () => {
    if (!activeSessionId) return;

    try {
      await endSession({
        sessionId: activeSessionId,
        satisfaction: sessionSatisfaction > 0 ? sessionSatisfaction : undefined,
        productivity: sessionProductivity > 0 ? sessionProductivity : undefined,
        notes: sessionNotes || undefined,
        activities: sessionActivities ? sessionActivities.split(',').map(a => a.trim()) : undefined,
      });
      
      setActiveSessionId(null);
      setSessionStartTime(null);
      setShowRatingModal(false);
      hapticFeedback.success();
      Alert.alert('Success', 'Session ended successfully');
    } catch (error) {
      hapticFeedback.error();
      
      // Check if the error is due to session not found (deleted)
      if (error instanceof Error && error.message.includes('not found')) {
        Alert.alert('Session Not Found', 'This session has been deleted. The active session has been cleared.');
        setActiveSessionId(null);
        setSessionStartTime(null);
        setShowRatingModal(false);
      } else {
        Alert.alert('Error', 'Failed to end session');
      }
    }
  };

  const handleLogSession = async () => {
    if (!logDuration) {
      Alert.alert('Error', 'Please enter session duration');
      return;
    }

    try {
      await logSession({
        subscriptionId: subscription._id,
        duration: parseInt(logDuration),
        sessionType: 'manual',
        activities: logActivities ? logActivities.split(',').map(a => a.trim()) : undefined,
        notes: logNotes || undefined,
        satisfaction: logSatisfaction || undefined,
        productivity: logProductivity || undefined,
        deviceType: logDevice || undefined,
        location: logLocation || undefined,
      });

      setShowLogSessionModal(false);
      setLogDuration('');
      setLogActivities('');
      setLogNotes('');
      setLogSatisfaction(0);
      setLogProductivity(0);
      setLogDevice('');
      setLogLocation('');
      hapticFeedback.success();
      Alert.alert('Success', 'Usage session logged successfully');
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to log session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Check if this is the currently active session
    const isActiveSession = activeSessionId === sessionId;
    
    Alert.alert(
      'Delete Session',
      isActiveSession 
        ? 'This is your currently active session. Deleting it will stop the session immediately. Are you sure?'
        : 'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession({ sessionId: sessionId as any });
              
              // If this was the active session, clear the active session state
              if (isActiveSession) {
                setActiveSessionId(null);
                setSessionStartTime(null);
                setShowRatingModal(false);
              }
              
              hapticFeedback.success();
              Alert.alert('Success', 'Session deleted successfully');
            } catch (error) {
              hapticFeedback.error();
              Alert.alert('Error', 'Failed to delete session');
            }
          }
        }
      ]
    );
  };

  const handleSetGoal = async () => {
    if (!goalTarget) {
      Alert.alert('Error', 'Please enter goal target');
      return;
    }

    try {
      await setGoal({
        subscriptionId: subscription._id,
        goalType: goalType as any,
        targetValue: parseFloat(goalTarget),
        reminderEnabled: true,
        reminderFrequency: 'weekly',
      });

      setShowGoalModal(false);
      setGoalTarget('');
      hapticFeedback.success();
      Alert.alert('Success', 'Usage goal set successfully');
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to set goal');
    }
  };

  const renderOverviewTab = () => (
    <View style={{ padding: theme.spacing[5] }}>
      {/* Subscription Header */}
      <Card style={{ marginBottom: theme.spacing[5] }}>
        <View style={{ alignItems: 'center', marginBottom: theme.spacing[4] }}>
          <View style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 40, 
            backgroundColor: getCategoryData(subscription.category).color,
            justifyContent: 'center', 
            alignItems: 'center',
            marginBottom: theme.spacing[4],
            ...theme.shadows.md
          }}>
            <MaterialIcons name={getCategoryData(subscription.category).icon as any} size={32} color={theme.colors.text.inverse} />
          </View>
          <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[1] }}>{subscription.name}</Text>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[2] }}>{subscription.provider}</Text>
          <View style={{ 
            backgroundColor: theme.colors.primary[50], 
            paddingHorizontal: theme.spacing[3], 
            paddingVertical: theme.spacing[1], 
            borderRadius: theme.borderRadius.full 
          }}>
            <Text variant="caption" weight="medium" style={{ color: getCategoryData(subscription.category).color }}>
              {getCategoryData(subscription.category).name}
            </Text>
          </View>
        </View>
      </Card>

      {/* Cost Overview */}
      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Cost Overview</Text>
        <Card>
          <View style={{ paddingVertical: theme.spacing[2], borderBottomWidth: 1, borderBottomColor: theme.colors.border.light }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" color="secondary">Current Cost</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="body" weight="semibold">
                  {formatCurrency(subscription.cost)}
                </Text>
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing[1] }}>
                  /{subscription.billingCycle}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ paddingVertical: theme.spacing[2], borderBottomWidth: 1, borderBottomColor: theme.colors.border.light }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" color="secondary">Monthly Equivalent</Text>
              <Text variant="body" weight="semibold" style={{ color: theme.colors.primary[500] }}>
                {formatCurrency(calculateMonthlyCost())}
              </Text>
            </View>
          </View>
          
          <View style={{ paddingVertical: theme.spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" color="secondary">Next Billing</Text>
              <Text variant="body" weight="semibold">
                {getRelativeDate(subscription.nextBillingDate)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Usage Information */}
      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Usage Information</Text>
        <Card>
          <View style={{ paddingVertical: theme.spacing[2], borderBottomWidth: 1, borderBottomColor: theme.colors.border.light }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" color="secondary">Usage Frequency</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  backgroundColor: getUsageColor(subscription.usageFrequency),
                  marginRight: theme.spacing[2]
                }} />
                <Text variant="body" weight="semibold" style={{ color: getUsageColor(subscription.usageFrequency) }}>
                  {subscription.usageFrequency?.charAt(0).toUpperCase() + subscription.usageFrequency?.slice(1) || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ paddingVertical: theme.spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" color="secondary">Last Used</Text>
              <Text variant="body" weight="semibold">
                {subscription.lastUsed ? formatDate(subscription.lastUsed) : 'Never'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button 
            variant="outline" 
            size="medium"
            onPress={() => setShowUsageModal(true)}
            style={{ flex: 1, marginRight: theme.spacing[2] }}
          >
            <MaterialIcons name="trending-up" size={16} color={theme.colors.primary[500]} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[1], color: theme.colors.primary[500] }}>
              Update Usage
            </Text>
          </Button>
          
          <Button 
            variant="outline" 
            size="medium"
            onPress={() => setShowManageModal(true)}
            style={{ flex: 1, marginLeft: theme.spacing[2] }}
          >
            <MaterialIcons name="more-horiz" size={16} color={theme.colors.neutral[600]} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[1], color: theme.colors.neutral[600] }}>
              Manage
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <View style={{ padding: theme.spacing[5] }}>
      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Cost History</Text>
        {subscription.costHistory && subscription.costHistory.length > 0 ? (
          <FlatList
            data={subscription.costHistory.slice().reverse()}
            renderItem={({ item, index }) => (
              <Card style={{ marginBottom: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="semibold">
                      {formatCurrency(item.amount, item.currency)}
                    </Text>
                    <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                      {formatDate(item.date)}
                    </Text>
                    {item.reason && (
                      <Text variant="caption" style={{ color: theme.colors.primary[500], marginTop: theme.spacing[1] }}>
                        {item.reason}
                      </Text>
                    )}
                  </View>
                  {index === 0 && (
                    <View style={{ 
                      backgroundColor: theme.colors.success[500], 
                      paddingHorizontal: theme.spacing[2], 
                      paddingVertical: theme.spacing[1], 
                      borderRadius: theme.borderRadius.full 
                    }}>
                      <Text variant="caption" weight="medium" style={{ color: '#fff' }}>Current</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Card>
            <View style={{ padding: theme.spacing[10], alignItems: 'center' }}>
              <MaterialIcons name="history" size={48} color={theme.colors.text.secondary} />
              <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[3] }}>
                No cost history available
              </Text>
            </View>
          </Card>
        )}
      </View>

      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Subscription Timeline</Text>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing[3] }}>
            <View style={{ 
              width: 12, 
              height: 12, 
              borderRadius: 6, 
              backgroundColor: theme.colors.success[500], 
              marginRight: theme.spacing[4] 
            }} />
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="semibold">Subscription Started</Text>
              <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                {formatDate(subscription.startDate)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing[3] }}>
            <View style={{ 
              width: 12, 
              height: 12, 
              borderRadius: 6, 
              backgroundColor: theme.colors.primary[500], 
              marginRight: theme.spacing[4] 
            }} />
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="semibold">Next Renewal</Text>
              <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                {formatDate(subscription.renewalDate)}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );

  const renderUsageTab = () => (
    <View style={{ padding: theme.spacing[5] }}>
      {/* Usage Overview */}
      {usageAnalytics && (
        <Card style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>Usage Overview (30 Days)</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text variant="h3" weight="bold" style={{ color: theme.colors.primary[500], textAlign: 'center' }}>{usageAnalytics.usage.totalSessions}</Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Sessions</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text variant="h3" weight="bold" style={{ color: theme.colors.success[500], textAlign: 'center' }}>{usageAnalytics.usage.totalHours}h</Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Total Hours</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text variant="h3" weight="bold" style={{ color: theme.colors.warning[500], textAlign: 'center' }}>{usageAnalytics.usage.averageSessionDuration}m</Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>Avg Session</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Active Session */}
      {activeSessionId && (
        <Card style={{ 
          marginBottom: theme.spacing[5], 
          backgroundColor: theme.colors.primary[50],
          borderColor: theme.colors.primary[200]
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] }}>
            <MaterialIcons name="play-circle-filled" size={24} color={theme.colors.primary[500]} />
            <Text variant="h5" weight="semibold" style={{ marginLeft: theme.spacing[2], color: theme.colors.primary[700] }}>
              Active Session
            </Text>
          </View>
          <Text variant="h3" weight="bold" style={{ color: theme.colors.primary[700], marginBottom: theme.spacing[2] }}>
            {sessionStartTime ? Math.round((Date.now() - sessionStartTime) / (1000 * 60)) : 0}m
          </Text>
          <Button 
            variant="primary" 
            size="medium"
            onPress={() => { hapticFeedback.buttonPress(); handleEndSession(); }}
          >
            <MaterialIcons name="stop" size={16} color={theme.colors.text.inverse} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[1], color: theme.colors.text.inverse }}>
              End Session
            </Text>
          </Button>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Quick Actions</Text>
        <View style={{ 
          flexDirection: 'row', 
          gap: theme.spacing[3],
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Button 
            variant="outline" 
            size="medium"
            onPress={() => { hapticFeedback.buttonPress(); handleStartSession(); }}
            style={{ flex: 1, maxWidth: 150 }}
            disabled={!!activeSessionId}
          >
            <MaterialIcons name="play-arrow" size={16} color={theme.colors.primary[500]} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[1], color: theme.colors.primary[500] }}>
              Start Session
            </Text>
          </Button>
          
          <Button 
            variant="outline" 
            size="medium"
            onPress={() => { hapticFeedback.buttonPress(); setShowLogSessionModal(true); }}
            style={{ flex: 1, maxWidth: 150 }}
          >
            <MaterialIcons name="add" size={16} color={theme.colors.secondary[500]} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[1], color: theme.colors.secondary[500] }}>
              Log Session
            </Text>
          </Button>
        </View>
      </Card>

      {/* Usage Goals */}
      {usageGoals && usageGoals.length > 0 && (
        <View style={{ marginBottom: theme.spacing[5] }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: theme.spacing[3]
          }}>
            <Text variant="h4" weight="semibold">Usage Goals</Text>
            <TouchableOpacity 
              onPress={() => { hapticFeedback.buttonPress(); setShowGoalModal(true); }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>
          
          {usageGoals.map((goal) => (
            <Card key={goal._id} style={{ marginBottom: theme.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="semibold">{goal.goalType.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                    {goal.currentValue} / {goal.targetValue} {goal.goalType.includes('hours') ? 'hours' : 'sessions'}
                  </Text>
                </View>
                <View style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 30, 
                  backgroundColor: goal.isAchieved ? theme.colors.success[500] : theme.colors.primary[500],
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text variant="body" weight="bold" style={{ color: theme.colors.text.inverse }}>
                    {Math.round((goal.currentValue / goal.targetValue) * 100)}%
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Recent Sessions</Text>
          <FlatList
            data={recentSessions}
            renderItem={({ item }) => (
              <Card style={{ marginBottom: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="semibold">
                      {item.duration}m session
                    </Text>
                    <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                      {new Date(item.startTime).toLocaleDateString()}
                    </Text>
                    {item.notes && (
                      <Text variant="caption" style={{ marginTop: theme.spacing[1] }}>
                        {item.notes}
                      </Text>
                    )}
                    {(item.satisfaction || item.productivity) && (
                      <View style={{ flexDirection: 'row', marginTop: theme.spacing[2], gap: theme.spacing[3] }}>
                        {item.satisfaction && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="caption" color="secondary">Satisfaction: </Text>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <MaterialIcons
                                key={star}
                                name={star <= item.satisfaction ? 'star' : 'star-border'}
                                size={12}
                                color={theme.colors.warning[500]}
                              />
                            ))}
                          </View>
                        )}
                        {item.productivity && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="caption" color="secondary">Productivity: </Text>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <MaterialIcons
                                key={star}
                                name={star <= item.productivity ? 'star' : 'star-border'}
                                size={12}
                                color={theme.colors.warning[500]}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteSession(item._id)}
                    activeOpacity={0.7}
                    style={{ padding: theme.spacing[1] }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={theme.colors.error[500]} />
                  </TouchableOpacity>
                </View>
              </Card>
            )}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={{ backgroundColor: theme.colors.background.card, paddingTop: theme.spacing[4], paddingBottom: theme.spacing[2], paddingHorizontal: theme.spacing[5], borderBottomWidth: 1, borderBottomColor: theme.colors.border.light }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => { hapticFeedback.buttonPress(); navigation.goBack(); }} activeOpacity={0.7} style={{ padding: theme.spacing[2] }}>
            <MaterialIcons name="arrow-back" size={28} color={theme.colors.primary[500]} />
          </TouchableOpacity>
          <Text variant="h5" weight="semibold" style={{ flex: 1, textAlign: 'center' }}>{subscription.name}</Text>
          <TouchableOpacity onPress={() => { hapticFeedback.buttonPress(); setShowManageModal(true); }} activeOpacity={0.7} style={{ padding: theme.spacing[2] }}>
            <MaterialIcons name="more-vert" size={28} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === "overview" ? renderOverviewTab() : 
         activeTab === "history" ? renderHistoryTab() : 
         activeTab === "usage" ? renderUsageTab() : renderOverviewTab()}
      </ScrollView>

      {/* Tab Footer */}
      <View style={{ 
        flexDirection: 'row', 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: theme.colors.background.card, 
        borderTopWidth: 1, 
        borderTopColor: theme.colors.border.light 
      }}>
        <TouchableOpacity
          style={{ 
            flex: 1, 
            padding: theme.spacing[3], 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: activeTab === "overview" ? theme.colors.primary[500] : 'transparent'
          }}
          onPress={() => { hapticFeedback.buttonPress(); setActiveTab("overview"); }}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="dashboard" 
            size={24} 
            color={activeTab === "overview" ? "#fff" : theme.colors.text.secondary} 
          />
          <Text
            variant="caption"
            weight="medium"
            style={{ 
              marginTop: theme.spacing[1],
              color: activeTab === "overview" ? "#fff" : theme.colors.text.secondary
            }}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ 
            flex: 1, 
            padding: theme.spacing[3], 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: activeTab === "history" ? theme.colors.primary[500] : 'transparent'
          }}
          onPress={() => { hapticFeedback.buttonPress(); setActiveTab("history"); }}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="history" 
            size={24} 
            color={activeTab === "history" ? "#fff" : theme.colors.text.secondary} 
          />
          <Text
            variant="caption"
            weight="medium"
            style={{ 
              marginTop: theme.spacing[1],
              color: activeTab === "history" ? "#fff" : theme.colors.text.secondary
            }}
          >
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ 
            flex: 1, 
            padding: theme.spacing[3], 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: activeTab === "usage" ? theme.colors.primary[500] : 'transparent'
          }}
          onPress={() => { hapticFeedback.buttonPress(); setActiveTab("usage"); }}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="assessment" 
            size={24} 
            color={activeTab === "usage" ? "#fff" : theme.colors.text.secondary} 
          />
          <Text
            variant="caption"
            weight="medium"
            style={{ 
              marginTop: theme.spacing[1],
              color: activeTab === "usage" ? "#fff" : theme.colors.text.secondary
            }}
          >
            Usage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Usage Modal */}
      <Modal visible={showUsageModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            padding: theme.spacing[5], 
            maxHeight: '70%' 
          }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
              Update Usage Frequency
            </Text>
            <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[5], textAlign: 'center' }}>
              How often do you use {subscription.name}?
            </Text>
            <FlatList
              data={usageOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical: theme.spacing[3], 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.colors.border.light 
                  }}
                  onPress={() => { hapticFeedback.buttonPress(); handleUsageUpdate(item.id); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="medium">{item.name}</Text>
                    <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                      {item.description}
                    </Text>
                  </View>
                  {subscription.usageFrequency === item.id && (
                    <MaterialIcons name="check" size={24} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={{ 
                backgroundColor: theme.colors.background.secondary, 
                padding: theme.spacing[4], 
                borderRadius: theme.borderRadius.base, 
                alignItems: 'center', 
                marginTop: theme.spacing[5] 
              }}
              onPress={() => { hapticFeedback.buttonPress(); setShowUsageModal(false); }}
              activeOpacity={0.7}
            >
              <Text variant="body" weight="medium" color="secondary">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Management Modal */}
      <Modal visible={showManageModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            padding: theme.spacing[5], 
            maxHeight: '70%' 
          }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[5], textAlign: 'center' }}>
              Manage Subscription
            </Text>
            <FlatList
              data={managementOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical: theme.spacing[4], 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.colors.border.light 
                  }}
                  onPress={() => { hapticFeedback.buttonPress(); item.action(); }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={item.icon as any} size={24} color={item.color} />
                  <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[3], color: item.color }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={{ 
                backgroundColor: theme.colors.background.secondary, 
                padding: theme.spacing[4], 
                borderRadius: theme.borderRadius.base, 
                alignItems: 'center', 
                marginTop: theme.spacing[5] 
              }}
              onPress={() => { hapticFeedback.buttonPress(); setShowManageModal(false); }}
              activeOpacity={0.7}
            >
              <Text variant="body" weight="medium" color="secondary">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Session Modal */}
      <Modal visible={showLogSessionModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <ScrollView style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            maxHeight: '85%' 
          }}>
            <View style={{ padding: theme.spacing[5] }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>
                Log Session
              </Text>
              
              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Duration (minutes)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                  }}
                  value={logDuration}
                  onChangeText={setLogDuration}
                  placeholder="Enter duration in minutes"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Activities (comma-separated)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                  }}
                  value={logActivities}
                  onChangeText={setLogActivities}
                  placeholder="e.g., coding, debugging, planning"
                />
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Notes</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                    height: 80,
                    textAlignVertical: 'top',
                  }}
                  value={logNotes}
                  onChangeText={setLogNotes}
                  placeholder="Add any notes about this session"
                  multiline
                />
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Satisfaction Rating</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setLogSatisfaction(star)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={star <= logSatisfaction ? 'star' : 'star-border'}
                        size={32}
                        color={theme.colors.warning[500]}
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Productivity Rating</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setLogProductivity(star)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={star <= logProductivity ? 'star' : 'star-border'}
                        size={32}
                        color={theme.colors.warning[500]}
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Device Type</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                  }}
                  value={logDevice}
                  onChangeText={setLogDevice}
                  placeholder="e.g., MacBook, iPhone, iPad"
                />
              </View>

              <View style={{ marginBottom: theme.spacing[5] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Location</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                  }}
                  value={logLocation}
                  onChangeText={setLogLocation}
                  placeholder="e.g., Home, Office, Coffee Shop"
                />
              </View>
            </View>
          </ScrollView>
          
          <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
            <View style={{ 
              backgroundColor: theme.colors.background.card, 
              paddingHorizontal: theme.spacing[5], 
              paddingBottom: theme.spacing[5],
              paddingTop: theme.spacing[4],
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.light
            }}>
              <View style={{ 
                flexDirection: 'row', 
                gap: theme.spacing[3],
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Button 
                  variant="outline" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); setShowLogSessionModal(false); }}
                  style={{ flex: 1, maxWidth: 140 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.secondary }}>
                    Cancel
                  </Text>
                </Button>
                <Button 
                  variant="primary" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); handleLogSession(); }}
                  style={{ flex: 1, maxWidth: 160 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.inverse }}>
                    Log Session
                  </Text>
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <ScrollView style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            maxHeight: '85%' 
          }}>
            <View style={{ padding: theme.spacing[5] }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>
                Rate Your Session
              </Text>
              
              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>How satisfied were you with this session?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSessionSatisfaction(star)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={star <= sessionSatisfaction ? 'star' : 'star-border'}
                        size={32}
                        color={theme.colors.warning[500]}
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>How productive was this session?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSessionProductivity(star)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={star <= sessionProductivity ? 'star' : 'star-border'}
                        size={32}
                        color={theme.colors.warning[500]}
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Activities (comma-separated)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                  }}
                  value={sessionActivities}
                  onChangeText={setSessionActivities}
                  placeholder="e.g., coding, debugging, planning"
                />
              </View>

              <View style={{ marginBottom: theme.spacing[5] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Notes</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: 16,
                    height: 80,
                    textAlignVertical: 'top',
                  }}
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  placeholder="Add any notes about this session"
                  multiline
                />
              </View>
            </View>
          </ScrollView>
          
          <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
            <View style={{ 
              backgroundColor: theme.colors.background.card, 
              paddingHorizontal: theme.spacing[5], 
              paddingBottom: theme.spacing[5],
              paddingTop: theme.spacing[4],
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.light
            }}>
              <View style={{ 
                flexDirection: 'row', 
                gap: theme.spacing[3],
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Button 
                  variant="outline" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); setShowRatingModal(false); }}
                  style={{ flex: 1, maxWidth: 140 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.secondary }}>
                    Cancel
                  </Text>
                </Button>
                <Button 
                  variant="primary" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); handleConfirmEndSession(); }}
                  style={{ flex: 1, maxWidth: 160 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.inverse }}>
                    End Session
                  </Text>
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            padding: theme.spacing[5], 
            maxHeight: '70%' 
          }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>
              Set Usage Goal
            </Text>
            
            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Goal Type</Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: theme.spacing[3],
                    borderWidth: 1,
                    borderColor: goalType === 'hours_per_month' ? theme.colors.primary[500] : theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    backgroundColor: goalType === 'hours_per_month' ? theme.colors.primary[50] : 'transparent',
                    alignItems: 'center'
                  }}
                  onPress={() => setGoalType('hours_per_month')}
                  activeOpacity={0.7}
                >
                  <Text variant="body" weight="medium" style={{ 
                    color: goalType === 'hours_per_month' ? theme.colors.primary[500] : theme.colors.text.secondary 
                  }}>
                    Hours/Month
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: theme.spacing[3],
                    borderWidth: 1,
                    borderColor: goalType === 'sessions_per_month' ? theme.colors.primary[500] : theme.colors.border.light,
                    borderRadius: theme.borderRadius.base,
                    backgroundColor: goalType === 'sessions_per_month' ? theme.colors.primary[50] : 'transparent',
                    alignItems: 'center'
                  }}
                  onPress={() => setGoalType('sessions_per_month')}
                  activeOpacity={0.7}
                >
                  <Text variant="body" weight="medium" style={{ 
                    color: goalType === 'sessions_per_month' ? theme.colors.primary[500] : theme.colors.text.secondary 
                  }}>
                    Sessions/Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: theme.spacing[5] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Target Value</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.light,
                  borderRadius: theme.borderRadius.base,
                  padding: theme.spacing[3],
                  fontSize: 16,
                }}
                value={goalTarget}
                onChangeText={setGoalTarget}
                placeholder={goalType === 'hours_per_month' ? 'Enter hours per month' : 'Enter sessions per month'}
                keyboardType="numeric"
              />
            </View>

            <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
              <View style={{ 
                flexDirection: 'row', 
                gap: theme.spacing[3],
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Button 
                  variant="outline" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); setShowGoalModal(false); }}
                  style={{ flex: 1, maxWidth: 140 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.secondary }}>
                    Cancel
                  </Text>
                </Button>
                <Button 
                  variant="primary" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); handleSetGoal(); }}
                  style={{ flex: 1, maxWidth: 160 }}
                >
                  <Text variant="body" weight="medium" style={{ color: theme.colors.text.inverse }}>
                    Set Goal
                  </Text>
                </Button>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});



