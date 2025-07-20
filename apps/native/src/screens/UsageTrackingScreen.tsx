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
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { MaterialIcons } from '@expo/vector-icons';
import { RFValue } from 'react-native-responsive-fontsize';
import { useNavigation, useRoute } from '@react-navigation/native';
// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

interface UsageSession {
  _id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  sessionType: 'manual' | 'auto' | 'imported';
  activities?: string[];
  notes?: string;
  satisfaction?: number;
  productivity?: number;
  deviceType?: string;
  location?: string;
}

interface UsageGoal {
  _id: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isAchieved: boolean;
}

const UsageTrackingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { subscriptionId } = route.params as { subscriptionId: string };

  const [refreshing, setRefreshing] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Session logging form state
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

  // Goal form state
  const [goalType, setGoalType] = useState('weekly_hours');
  const [goalTarget, setGoalTarget] = useState('');

  // Fetch data
  const subscription = useQuery(api.subscriptions.getSubscription, { id: subscriptionId as Id<"subscriptions"> });
  const usageAnalytics = useQuery(api.subscriptions.getUsageAnalytics, { 
    subscriptionId: subscriptionId as Id<"subscriptions">, 
    period: 'month' 
  });
  const recentSessions = useQuery(api.subscriptions.getUsageSessions, { 
    subscriptionId: subscriptionId as Id<"subscriptions">, 
    limit: 20 
  });
  const usageGoals = useQuery(api.subscriptions.getUsageGoals, { 
    subscriptionId: subscriptionId as Id<"subscriptions">, 
    activeOnly: true 
  });
  const valueInsights = useQuery(api.subscriptions.getUsageValueInsights);

  // Mutations
  const startSession = useMutation(api.subscriptions.startUsageSession);
  const endSession = useMutation(api.subscriptions.endUsageSession);
  const logSession = useMutation(api.subscriptions.logUsageSession);
  const deleteSession = useMutation(api.subscriptions.deleteUsageSession);
  const setGoal = useMutation(api.subscriptions.setUsageGoal);
  const initializeStats = useMutation(api.subscriptions.initializeUsageStats);

  useEffect(() => {
    // Initialize usage stats if they don't exist
    if (subscription && !subscription.usageStats) {
      initializeStats({ subscriptionId: subscriptionId as Id<"subscriptions"> });
    }
  }, [subscription]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStartSession = async () => {
    try {
      const sessionId = await startSession({
        subscriptionId: subscriptionId as Id<"subscriptions">,
        sessionType: 'manual',
        deviceType: 'mobile',
      });
      setActiveSessionId(sessionId);
      setSessionStartTime(Date.now());
      hapticFeedback.success();
      Alert.alert('Session Started', 'Usage session has been started. Tap "End Session" when finished.');
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSessionId || !sessionStartTime) return;

    const duration = Math.round((Date.now() - sessionStartTime) / (1000 * 60));
    
    // Reset rating modal state
    setSessionSatisfaction(0);
    setSessionProductivity(0);
    setSessionNotes('');
    setSessionActivities('');
    
    // Show rating modal instead of alert
    setShowRatingModal(true);
  };

  const handleConfirmEndSession = async () => {
    if (!activeSessionId) return;

    try {
      await endSession({
        sessionId: activeSessionId as any,
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
        subscriptionId: subscriptionId as Id<"subscriptions">,
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

  const handleSetGoal = async () => {
    if (!goalTarget) {
      Alert.alert('Error', 'Please enter goal target');
      return;
    }

    try {
      await setGoal({
        subscriptionId: subscriptionId as Id<"subscriptions">,
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderStarRating = (rating: number, size = 16) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={size}
            color={theme.colors.warning[500]}
          />
        ))}
      </View>
    );
  };

  const renderUsageOverview = () => {
    if (!usageAnalytics) return null;

    return (
      <Card style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Usage Overview (30 Days)</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.primary[500] }}>{usageAnalytics.usage.totalSessions}</Text>
            <Text variant="body" color="secondary">Sessions</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.success[500] }}>{usageAnalytics.usage.totalHours}h</Text>
            <Text variant="body" color="secondary">Total Hours</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: theme.colors.warning[500] }}>{usageAnalytics.usage.averageSessionDuration}m</Text>
            <Text variant="body" color="secondary">Avg Session</Text>
          </View>
          </View>
      </Card>
    );
  };

  const renderActiveSession = () => {
    if (!activeSessionId) return null;

    const elapsedMinutes = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / (1000 * 60)) : 0;

    return (
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
          {formatDuration(elapsedMinutes)}
        </Text>
        <Button 
          variant="primary" 
          size="medium"
          onPress={() => { hapticFeedback.buttonPress(); handleEndSession(); }}
        >
          <MaterialIcons name="stop" size={16} color={theme.colors.text.inverse} />
          <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1], color: theme.colors.text.inverse }}>
            End Session
          </Text>
        </Button>
      </Card>
    );
  };

  const renderQuickActions = () => (
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
          <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1], color: theme.colors.primary[500] }}>
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
          <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1], color: theme.colors.secondary[500] }}>
            Log Session
          </Text>
        </Button>
        </View>
    </Card>
    );

  const renderUsageGoals = () => {
    if (!usageGoals || usageGoals.length === 0) return null;

    return (
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
    );
  };

  const renderRecentSessions = () => {
    if (!recentSessions || recentSessions.length === 0) return null;

    return (
      <View style={{ marginBottom: theme.spacing[5] }}>
        <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Recent Sessions</Text>
        <FlatList
          data={recentSessions}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: theme.spacing[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing[2] }}>
                    <Text variant="body" weight="semibold">{formatDuration(item.duration || 0)}</Text>
                    <TouchableOpacity
                      onPress={() => { hapticFeedback.buttonPress(); handleDeleteSession(item._id); }}
                      style={{ padding: theme.spacing[1] }}
                    >
                      <MaterialIcons name="delete" size={20} color={theme.colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing[2] }}>
                    {new Date(item.startTime).toLocaleDateString()}
                  </Text>
                  
                  {item.notes && (
                    <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing[2] }}>
                      {item.notes}
                    </Text>
                  )}

                  {/* Ratings Section */}
                  {(item.satisfaction || item.productivity) && (
                    <View style={{ marginTop: theme.spacing[2] }}>
                      {item.satisfaction && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[1] }}>
                          <Text variant="caption" weight="medium" style={{ marginRight: theme.spacing[2], minWidth: 80 }}>
                            Satisfaction:
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {renderStarRating(item.satisfaction, 12)}
                            <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing[1] }}>
                              {item.satisfaction === 1 ? 'Poor' :
                               item.satisfaction === 2 ? 'Fair' :
                               item.satisfaction === 3 ? 'Good' :
                               item.satisfaction === 4 ? 'Very Good' : 'Excellent'}
                            </Text>
                          </View>
                        </View>
                      )}
                      
                      {item.productivity && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text variant="caption" weight="medium" style={{ marginRight: theme.spacing[2], minWidth: 80 }}>
                            Productivity:
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <MaterialIcons
                                  key={star}
                                  name={star <= item.productivity ? 'star' : 'star-border'}
                                  size={12}
                                  color={theme.colors.success[500]}
                                />
                              ))}
                            </View>
                            <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing[1] }}>
                              {item.productivity === 1 ? 'Very Low' :
                               item.productivity === 2 ? 'Low' :
                               item.productivity === 3 ? 'Medium' :
                               item.productivity === 4 ? 'High' : 'Very High'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </Card>
          )}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderLogSessionModal = () => (
    <Modal visible={showLogSessionModal} transparent animationType="slide">
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background.modal, 
        justifyContent: 'flex-end' 
      }}>
        <View style={{ 
          backgroundColor: theme.colors.background.card, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20, 
          maxHeight: '85%'
        }}>
            <ScrollView 
              style={{ padding: theme.spacing[5] }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: theme.spacing[5] }}
            >
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                Log Usage Session
              </Text>
              
            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Duration (minutes)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.medium,
                  borderRadius: theme.borderRadius.base,
                  padding: theme.spacing[3],
                  fontSize: theme.typography.size.base,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary
                }}
                placeholder="Enter duration in minutes"
                placeholderTextColor={theme.colors.text.tertiary}
                value={logDuration}
                onChangeText={setLogDuration}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Activities (comma-separated)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.medium,
                  borderRadius: theme.borderRadius.base,
                  padding: theme.spacing[3],
                  fontSize: theme.typography.size.base,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary
                }}
                placeholder="e.g., watching, learning, entertainment"
                placeholderTextColor={theme.colors.text.tertiary}
                value={logActivities}
                onChangeText={setLogActivities}
              />
            </View>

            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Notes</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.medium,
                  borderRadius: theme.borderRadius.base,
                  padding: theme.spacing[3],
                  fontSize: theme.typography.size.base,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                  height: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Any additional notes about this session"
                placeholderTextColor={theme.colors.text.tertiary}
                value={logNotes}
                onChangeText={setLogNotes}
                multiline
              />
            </View>

            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Satisfaction Rating</Text>
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', marginBottom: theme.spacing[2] }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setLogSatisfaction(star)}
                      style={{ marginHorizontal: 4 }}
                    >
                      <MaterialIcons
                        name={star <= logSatisfaction ? 'star' : 'star-border'}
                        size={24}
                        color={theme.colors.warning[500]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text variant="caption" color="secondary">
                  {logSatisfaction === 0 ? 'Tap to rate' : 
                   logSatisfaction === 1 ? 'Poor' :
                   logSatisfaction === 2 ? 'Fair' :
                   logSatisfaction === 3 ? 'Good' :
                   logSatisfaction === 4 ? 'Very Good' : 'Excellent'}
                </Text>
                <TouchableOpacity
                  onPress={() => setLogSatisfaction(0)}
                  style={{ marginTop: theme.spacing[2] }}
                >
                  <Text variant="caption" style={{ color: theme.colors.primary[500] }}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: theme.spacing[4] }}>
              <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Productivity Rating</Text>
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', marginBottom: theme.spacing[2] }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setLogProductivity(star)}
                      style={{ marginHorizontal: 4 }}
                    >
                      <MaterialIcons
                        name={star <= logProductivity ? 'star' : 'star-border'}
                        size={24}
                        color={theme.colors.success[500]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text variant="caption" color="secondary">
                  {logProductivity === 0 ? 'Tap to rate' : 
                   logProductivity === 1 ? 'Very Low' :
                   logProductivity === 2 ? 'Low' :
                   logProductivity === 3 ? 'Medium' :
                   logProductivity === 4 ? 'High' : 'Very High'}
                </Text>
                <TouchableOpacity
                  onPress={() => setLogProductivity(0)}
                  style={{ marginTop: theme.spacing[2] }}
                >
                  <Text variant="caption" style={{ color: theme.colors.primary[500] }}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
            
            {/* Fixed button container at bottom */}
            <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
              <View style={{ 
                paddingHorizontal: theme.spacing[5],
                paddingTop: theme.spacing[3],
                paddingBottom: theme.spacing[4],
                borderTopWidth: 1,
                borderTopColor: theme.colors.border.light,
                backgroundColor: theme.colors.background.card
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
                  style={{ flex: 1, maxWidth: 140, paddingVertical: theme.spacing[3] }}
                >
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.text.secondary, lineHeight: 24 }}>Cancel</Text>
                </Button>
                
                <Button 
                  variant="primary" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); handleLogSession(); }}
                  style={{ flex: 1, maxWidth: 160, paddingVertical: theme.spacing[3] }}
                >
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.text.inverse, lineHeight: 24 }}>Log Session</Text>
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );

  const renderGoalModal = () => (
    <Modal visible={showGoalModal} transparent animationType="slide">
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background.modal, 
        justifyContent: 'flex-end' 
      }}>
        <View style={{ 
          backgroundColor: theme.colors.background.card, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20, 
          padding: theme.spacing[5], 
          maxHeight: '60%' 
        }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
            Set Usage Goal
          </Text>
          
          <View style={{ marginBottom: theme.spacing[4] }}>
            <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Goal Type</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.base,
                  borderWidth: 1,
                  borderColor: goalType === 'weekly_hours' ? theme.colors.primary[500] : theme.colors.border.medium,
                  backgroundColor: goalType === 'weekly_hours' ? theme.colors.primary[50] : theme.colors.background.primary,
                  alignItems: 'center'
                }}
                onPress={() => setGoalType('weekly_hours')}
              >
                <Text variant="body" weight="medium" style={{ 
                  color: goalType === 'weekly_hours' ? theme.colors.primary[500] : theme.colors.text.secondary 
                }}>
                  Weekly Hours
                </Text>
              </TouchableOpacity>
              
                    <TouchableOpacity
                style={{
                  flex: 1,
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.base,
                  borderWidth: 1,
                  borderColor: goalType === 'monthly_sessions' ? theme.colors.primary[500] : theme.colors.border.medium,
                  backgroundColor: goalType === 'monthly_sessions' ? theme.colors.primary[50] : theme.colors.background.primary,
                  alignItems: 'center'
                }}
                onPress={() => setGoalType('monthly_sessions')}
                    >
                <Text variant="body" weight="medium" style={{ 
                  color: goalType === 'monthly_sessions' ? theme.colors.primary[500] : theme.colors.text.secondary 
                }}>
                  Monthly Sessions
                      </Text>
                    </TouchableOpacity>
                </View>
              </View>

          <View style={{ marginBottom: theme.spacing[4] }}>
            <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Target Value</Text>
                <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border.medium,
                borderRadius: theme.borderRadius.base,
                padding: theme.spacing[3],
                fontSize: theme.typography.size.base,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary
              }}
              placeholder={`Enter target ${goalType.includes('hours') ? 'hours' : 'sessions'}`}
              placeholderTextColor={theme.colors.text.tertiary}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="numeric"
                />
            </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Button 
              variant="outline" 
              size="medium"
              onPress={() => { hapticFeedback.buttonPress(); setShowGoalModal(false); }}
              style={{ flex: 1 }}
              >
              <Text variant="body" weight="semibold" style={{ color: theme.colors.text.secondary }}>Cancel</Text>
            </Button>
            
            <Button 
              variant="primary" 
              size="medium"
              onPress={() => { hapticFeedback.buttonPress(); handleSetGoal(); }}
              style={{ flex: 1 }}
              >
              <Text variant="body" weight="semibold" style={{ color: theme.colors.text.inverse }}>Set Goal</Text>
            </Button>
            </View>
          </View>
        </View>
      </Modal>
    );

  const renderRatingModal = () => {
    const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / (1000 * 60)) : 0;
    
    return (
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: theme.colors.background.modal, 
          justifyContent: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: theme.colors.background.card, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            maxHeight: '90%'
          }}>
              <ScrollView 
                style={{ padding: theme.spacing[5] }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: theme.spacing[5] }}
              >
                <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                  Rate Your Experience
                </Text>
              
              <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing[4] }}>
                Session duration: {formatDuration(duration)}
              </Text>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Activities (comma-separated)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.medium,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: theme.typography.size.base,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.primary
                  }}
                  placeholder="e.g., watching, learning, entertainment"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={sessionActivities}
                  onChangeText={setSessionActivities}
                />
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Notes</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.medium,
                    borderRadius: theme.borderRadius.base,
                    padding: theme.spacing[3],
                    fontSize: theme.typography.size.base,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.primary,
                    height: 80,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Any additional notes about this session"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  multiline
                />
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Satisfaction Rating</Text>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', marginBottom: theme.spacing[2] }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setSessionSatisfaction(star)}
                        style={{ marginHorizontal: 4 }}
                      >
                        <MaterialIcons
                          name={star <= sessionSatisfaction ? 'star' : 'star-border'}
                          size={32}
                          color={theme.colors.warning[500]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text variant="caption" color="secondary">
                    {sessionSatisfaction === 0 ? 'Tap to rate' : 
                     sessionSatisfaction === 1 ? 'Poor' :
                     sessionSatisfaction === 2 ? 'Fair' :
                     sessionSatisfaction === 3 ? 'Good' :
                     sessionSatisfaction === 4 ? 'Very Good' : 'Excellent'}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: theme.spacing[4] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Productivity Rating</Text>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', marginBottom: theme.spacing[2] }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setSessionProductivity(star)}
                        style={{ marginHorizontal: 4 }}
                      >
                        <MaterialIcons
                          name={star <= sessionProductivity ? 'star' : 'star-border'}
                          size={32}
                          color={theme.colors.success[500]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text variant="caption" color="secondary">
                    {sessionProductivity === 0 ? 'Tap to rate' : 
                     sessionProductivity === 1 ? 'Very Low' :
                     sessionProductivity === 2 ? 'Low' :
                     sessionProductivity === 3 ? 'Medium' :
                     sessionProductivity === 4 ? 'High' : 'Very High'}
                  </Text>
                </View>
              </View>

              </ScrollView>
              
              {/* Fixed button container at bottom */}
              <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
                <View style={{ 
                  paddingHorizontal: theme.spacing[5],
                  paddingTop: theme.spacing[3],
                  paddingBottom: theme.spacing[4],
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border.light,
                  backgroundColor: theme.colors.background.card
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
                    style={{ flex: 1, maxWidth: 140, paddingVertical: theme.spacing[3] }}
                  >
                    <Text variant="body" weight="semibold" style={{ color: theme.colors.text.secondary, lineHeight: 24 }}>Cancel</Text>
                  </Button>
                  
                  <Button 
                    variant="primary" 
                    size="medium"
                    onPress={() => { hapticFeedback.buttonPress(); handleConfirmEndSession(); }}
                    style={{ flex: 1, maxWidth: 160, paddingVertical: theme.spacing[3] }}
                  >
                    <Text variant="body" weight="semibold" style={{ color: theme.colors.text.inverse, lineHeight: 24 }}>End Session</Text>
                  </Button>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    );
  };

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
        <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing[3] }}>Usage Tracking</Text>
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
        {renderUsageOverview()}
          {renderActiveSession()}
        {renderQuickActions()}
        {renderUsageGoals()}
        {renderRecentSessions()}
        </View>
      </ScrollView>

      {renderLogSessionModal()}
      {renderGoalModal()}
      {renderRatingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
});

export default UsageTrackingScreen; 