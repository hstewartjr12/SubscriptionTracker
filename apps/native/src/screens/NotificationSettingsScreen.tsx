import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

const { width } = Dimensions.get("window");

const NotificationSettingsScreen = ({ navigation }) => {
  const user = useUser();
  const firstName = user?.user?.firstName;
  
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [toastAnimation] = useState(new Animated.Value(0));
  
  const userPreferences = useQuery(api.subscriptions.getUserPreferences);
  const updateUserPreferences = useMutation(api.subscriptions.updateUserPreferences);
  const notifications = useQuery(api.subscriptions.getNotifications, { limit: 5 });
  const notificationCount = useQuery(api.subscriptions.getNotificationCount);
  const markAllAsRead = useMutation(api.subscriptions.markAllNotificationsAsRead);
  const deleteNotification = useMutation(api.subscriptions.deleteNotification);
  const markNotificationAsRead = useMutation(api.subscriptions.markNotificationAsRead);
  const generateRenewalReminders = useMutation(api.subscriptions.generateRenewalReminders);
  const generateBudgetAlerts = useMutation(api.subscriptions.generateBudgetAlerts);
  const generateUnusedAlerts = useMutation(api.subscriptions.generateUnusedSubscriptionAlerts);

  useEffect(() => {
    if ((userPreferences as any)?.monthlyBudget) {
      setBudgetAmount(((userPreferences as any).monthlyBudget / 100).toString());
    }
  }, [userPreferences]);

  const showNotificationToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    Animated.sequence([
      Animated.timing(toastAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

  const formatCurrency = (cents, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      renewal_reminder: "schedule",
      budget_alert: "trending-up",
      unused_subscription: "warning",
      price_increase: "arrow-upward",
      trial_ending: "timer"
    };
    return icons[type] || "notifications";
  };

  const getNotificationColor = (type) => {
    const colors = {
      renewal_reminder: theme.colors.success[500],
      budget_alert: theme.colors.warning[500],
      unused_subscription: theme.colors.error[500],
      price_increase: "#9C27B0",
      trial_ending: theme.colors.primary[500]
    };
    return colors[type] || theme.colors.neutral[600];
  };

  const handleToggleNotification = async (type, enabled) => {
    if (!userPreferences) return;
    
    try {
      await updateUserPreferences({
        notifications: {
          ...userPreferences.notifications,
          [type]: enabled,
        }
      });
      hapticFeedback.success();
      showNotificationToast(`${enabled ? 'Enabled' : 'Disabled'} ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`, "success");
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to update notification settings", "error");
    }
  };

  const handleSetBudget = async () => {
    if (!budgetAmount || isNaN(parseFloat(budgetAmount))) {
      showNotificationToast("Please enter a valid budget amount", "error");
      return;
    }

    try {
      await updateUserPreferences({
        monthlyBudget: Math.round(parseFloat(budgetAmount) * 100),
      });
      setShowBudgetModal(false);
      hapticFeedback.success();
      showNotificationToast(`Budget set to $${parseFloat(budgetAmount).toFixed(2)}`, "success");
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to set budget", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const count = await markAllAsRead();
      hapticFeedback.success();
      showNotificationToast(`Marked ${count} notifications as read`, "success");
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to mark notifications as read", "error");
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification({ notificationId });
      hapticFeedback.success();
      showNotificationToast("Notification deleted", "success");
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to delete notification", "error");
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead({ notificationId });
      hapticFeedback.success();
      showNotificationToast("Notification marked as read", "success");
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to mark notification as read", "error");
    }
  };

  const handleTestNotifications = async () => {
    try {
      const renewalResults = await generateRenewalReminders();
      const budgetResults = await generateBudgetAlerts();
      const unusedResults = await generateUnusedAlerts();
      
      const totalGenerated = renewalResults.length + budgetResults.length + unusedResults.length;
      
      if (totalGenerated > 0) {
        hapticFeedback.success();
        showNotificationToast(`Generated ${totalGenerated} test notification${totalGenerated > 1 ? 's' : ''}!`, "success");
      } else {
        showNotificationToast("No notifications generated - conditions not met", "info");
      }
    } catch (error) {
      hapticFeedback.error();
      showNotificationToast("Failed to generate test notifications", "error");
    }
  };

  const renderNotificationToggle = ({ title, description, type, enabled }) => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: theme.spacing[4], 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border.light 
    }}>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium">{title}</Text>
        <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing[1] }}>{description}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(value) => handleToggleNotification(type, value)}
        trackColor={{ false: theme.colors.border.medium, true: theme.colors.primary[500] }}
        thumbColor={enabled ? theme.colors.text.inverse : theme.colors.background.primary}
      />
    </View>
  );

  const renderNotificationItem = ({ item }) => (
    <Card style={{ 
      marginBottom: theme.spacing[3],
      opacity: item.isRead ? 0.7 : 1,
      borderLeftWidth: 4,
      borderLeftColor: item.isRead ? theme.colors.border.light : getNotificationColor(item.type)
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          backgroundColor: getNotificationColor(item.type) + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing[3]
        }}>
          <MaterialIcons 
            name={getNotificationIcon(item.type)} 
            size={20} 
            color={getNotificationColor(item.type)} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[1] }}>
            <Text variant="body" weight="medium" style={{ flex: 1 }}>{item.title}</Text>
            {!item.isRead && (
              <View style={{ 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: theme.colors.primary[500],
                marginLeft: theme.spacing[2]
              }} />
            )}
          </View>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[1] }}>{item.message}</Text>
          <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing[2] }}>{formatDate(item.createdAt)}</Text>
          
          {!item.isRead && (
            <TouchableOpacity 
              style={{ 
                alignSelf: 'flex-start',
                paddingHorizontal: theme.spacing[3],
                paddingVertical: theme.spacing[1],
                backgroundColor: theme.colors.primary[500] + '20',
                borderRadius: theme.borderRadius.full,
                marginTop: theme.spacing[1]
              }}
              onPress={() => { hapticFeedback.buttonPress(); handleMarkNotificationAsRead(item._id); }}
              activeOpacity={0.7}
            >
              <Text variant="caption" weight="medium" style={{ color: theme.colors.primary[500] }}>
                Mark as Read
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={{ padding: theme.spacing[2] }}
          onPress={() => { hapticFeedback.buttonPress(); handleDeleteNotification(item._id); }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderToast = () => {
    if (!showToast) return null;

    const toastColor = toastType === "success" ? theme.colors.success[500] : 
                      toastType === "error" ? theme.colors.error[500] : 
                      theme.colors.primary[500];
    
    const toastIcon = toastType === "success" ? "check-circle" : 
                      toastType === "error" ? "error" : 
                      "info";

    return (
      <Animated.View 
        style={{
          position: 'absolute',
          top: 60,
          left: theme.spacing[5],
          right: theme.spacing[5],
          zIndex: 1000,
          transform: [
            {
              translateY: toastAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
          opacity: toastAnimation,
        }}
      >
        <Card style={{ borderLeftWidth: 4, borderLeftColor: toastColor }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name={toastIcon} size={24} color={toastColor} />
            <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[2], flex: 1 }}>{toastMessage}</Text>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
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
        <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing[3] }}>Notifications</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: theme.spacing[5] }}>
          {/* Budget Settings */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Budget Settings</Text>
            <Card>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingVertical: theme.spacing[3]
              }}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="medium">Monthly Budget</Text>
                  <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[1] }}>
                    {(userPreferences as any)?.monthlyBudget ? formatCurrency((userPreferences as any).monthlyBudget) : 'Not set'}
                  </Text>
                </View>
                <Button 
                  variant="outline" 
                  size="small"
                  onPress={() => setShowBudgetModal(true)}
                >
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.primary[500] }}>Set Budget</Text>
                </Button>
              </View>
            </Card>
          </View>

          {/* Notification Preferences */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Notification Preferences</Text>
            <Card>
              {renderNotificationToggle({
                title: "Renewal Reminders",
                description: "Get notified before subscriptions renew",
                type: "renewalReminders",
                enabled: userPreferences?.notifications?.renewalReminders || false
              })}
              
              {renderNotificationToggle({
                title: "Budget Alerts",
                description: "Get notified when you exceed your budget",
                type: "budgetAlerts",
                enabled: userPreferences?.notifications?.budgetAlerts || false
              })}
              
              {renderNotificationToggle({
                title: "Unused Subscriptions",
                description: "Get notified about rarely used subscriptions",
                type: "unusedSubscriptions",
                enabled: userPreferences?.notifications?.unusedSubscriptions || false
              })}
              
              {renderNotificationToggle({
                title: "Price Increases",
                description: "Get notified about subscription price changes",
                type: "priceIncreases",
                enabled: (userPreferences?.notifications as any)?.priceIncreases || false
              })}
              
              {renderNotificationToggle({
                title: "Trial Endings",
                description: "Get notified before free trials end",
                type: "trialEndings",
                enabled: (userPreferences?.notifications as any)?.trialEndings || false
              })}
            </Card>
          </View>

          {/* Recent Notifications */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <View style={{ 
              flexDirection: 'column', 
              marginBottom: theme.spacing[3]
            }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2] }}>Recent Notifications</Text>
              <TouchableOpacity 
                onPress={() => { hapticFeedback.buttonPress(); handleMarkAllAsRead(); }}
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-end' }}
              >
                <Text variant="body" style={{ color: theme.colors.primary[500] }}>Mark All Read</Text>
              </TouchableOpacity>
            </View>
            
            {notifications && notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <View key={notification._id}>
                  {renderNotificationItem({ item: notification })}
                </View>
              ))
            ) : (
              <Card>
                <View style={{ padding: theme.spacing[10], alignItems: 'center' }}>
                  <MaterialIcons name="notifications-none" size={48} color={theme.colors.text.secondary} />
                  <Text variant="body" color="secondary" style={{ marginTop: theme.spacing[3] }}>
                    No notifications yet
                  </Text>
                </View>
              </Card>
            )}
          </View>

          {/* Test Notifications */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Test Notifications</Text>
            <Card>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[4] }}>
                Generate test notifications to verify your settings are working correctly.
              </Text>
              <Button 
                variant="primary" 
                size="medium"
                onPress={() => { hapticFeedback.buttonPress(); handleTestNotifications(); }}
              >
                <MaterialIcons name="notifications" size={16} color={theme.colors.text.inverse} />
                <Text variant="body" weight="semibold" style={{ marginLeft: theme.spacing[1], color: theme.colors.text.inverse }}>
                  Generate Test Notifications
                </Text>
              </Button>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Budget Modal */}
      <Modal visible={showBudgetModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: theme.colors.background.modal, 
          justifyContent: 'flex-end' 
        }}>
          <SafeAreaView style={{ backgroundColor: theme.colors.background.card }}>
            <View style={{ 
              backgroundColor: theme.colors.background.card, 
              borderTopLeftRadius: 20, 
              borderTopRightRadius: 20, 
              padding: theme.spacing[5],
              paddingBottom: theme.spacing[5] // Reduced since SafeAreaView handles bottom padding
            }}>
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                Set Monthly Budget
              </Text>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing[5], textAlign: 'center' }}>
                Set a monthly budget to track your subscription spending
              </Text>
              
              <View style={{ marginBottom: theme.spacing[6] }}>
                <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing[2] }}>Monthly Budget Amount</Text>
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
                  placeholder="Enter amount (e.g., 50.00)"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={{ 
                flexDirection: 'row', 
                gap: theme.spacing[4], // Increased gap between buttons
                justifyContent: 'center', // Center the buttons
                paddingHorizontal: theme.spacing[2] // Add horizontal padding
              }}>
                <Button 
                  variant="outline" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); setShowBudgetModal(false); }}
                  style={{ flex: 1, maxWidth: 140 }} // Limit button width
                >
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.text.secondary }}>Cancel</Text>
                </Button>
                
                <Button 
                  variant="primary" 
                  size="medium"
                  onPress={() => { hapticFeedback.buttonPress(); handleSetBudget(); }}
                  style={{ flex: 1, maxWidth: 140 }} // Limit button width
                >
                  <Text variant="body" weight="semibold" style={{ color: theme.colors.text.inverse }}>Set Budget</Text>
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {renderToast()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
});

export default NotificationSettingsScreen; 