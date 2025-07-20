import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Animated,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Modal,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { AntDesign, MaterialIcons, Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Text, Button, Card } from '../components/ui';
import { theme } from '../theme/theme';
import { hapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get("window");

export default function CreateSubscriptionScreen({ navigation }) {
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const subscriptionTemplates = useQuery(api.subscriptions.getSubscriptionTemplates, {});
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    provider: "",
    description: "",
    cost: "",
    currency: "USD",
    billingCycle: "monthly",
    startDate: new Date().toISOString().split('T')[0],
    renewalDate: "",
    category: "other",
    iconUrl: "",
    websiteUrl: "",
    supportUrl: "",
    reminderEnabled: true,
    reminderDaysBefore: 3,
  });

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const footerY = React.useRef(new Animated.Value(0)).current;

  const categories = [
    { id: "entertainment", name: "Entertainment", icon: "tv", color: "#FF6B6B" },
    { id: "productivity", name: "Productivity", icon: "work", color: "#4ECDC4" },
    { id: "gaming", name: "Gaming", icon: "sports-esports", color: "#45B7D1" },
    { id: "education", name: "Education", icon: "school", color: "#96CEB4" },
    { id: "health", name: "Health", icon: "favorite", color: "#FFEAA7" },
    { id: "finance", name: "Finance", icon: "account-balance", color: "#DDA0DD" },
    { id: "utilities", name: "Utilities", icon: "electrical-services", color: "#98D8C8" },
    { id: "news", name: "News", icon: "article", color: "#F7DC6F" },
    { id: "social", name: "Social", icon: "people", color: "#BB8FCE" },
    { id: "other", name: "Other", icon: "category", color: "#AED6F1" },
  ];

  const billingCycles = [
    { id: "monthly", name: "Monthly", description: "Billed every month" },
    { id: "yearly", name: "Yearly", description: "Billed every year" },
    { id: "quarterly", name: "Quarterly", description: "Billed every 3 months" },
    { id: "biannual", name: "Biannual", description: "Billed every 6 months" },
    { id: "weekly", name: "Weekly", description: "Billed every week" },
  ];

  const currencies = [
    { id: "USD", name: "US Dollar", symbol: "$" },
    { id: "EUR", name: "Euro", symbol: "€" },
    { id: "GBP", name: "British Pound", symbol: "£" },
    { id: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { id: "AUD", name: "Australian Dollar", symbol: "A$" },
  ];

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        Animated.timing(footerY, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        Animated.timing(footerY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [footerY]);

  // Calculate renewal date based on start date and billing cycle
  useEffect(() => {
    if (formData.startDate && formData.billingCycle) {
      const startDate = new Date(formData.startDate);
      let renewalDate = new Date(startDate);
      
      switch (formData.billingCycle) {
        case "weekly":
          renewalDate.setDate(startDate.getDate() + 7);
          break;
        case "monthly":
          renewalDate.setMonth(startDate.getMonth() + 1);
          break;
        case "quarterly":
          renewalDate.setMonth(startDate.getMonth() + 3);
          break;
        case "biannual":
          renewalDate.setMonth(startDate.getMonth() + 6);
          break;
        case "yearly":
          renewalDate.setFullYear(startDate.getFullYear() + 1);
          break;
      }
      
      setFormData(prev => ({
        ...prev,
        renewalDate: renewalDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.startDate, formData.billingCycle]);

  const footerTranslateY = footerY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const handleTemplateSelect = useCallback((template) => {
    hapticFeedback.cardSelect();
    setSelectedTemplate(template);
    setIsUsingTemplate(true);
    setShowTemplates(false);
    
    // Pre-fill form with template data
    setFormData(prev => ({
      ...prev,
      name: template.name,
      provider: template.provider,
      category: template.category,
      iconUrl: template.iconUrl,
      websiteUrl: template.websiteUrl,
      supportUrl: template.supportUrl,
      cost: template.commonCosts[0]?.amount ? (template.commonCosts[0].amount / 100).toFixed(2) : "",
      currency: template.commonCosts[0]?.currency || "USD",
      billingCycle: template.commonCosts[0]?.billingCycle || "monthly",
    }));
  }, []);

  const handleCustomSubscription = useCallback(() => {
    hapticFeedback.buttonPress();
    setIsUsingTemplate(false);
    setShowTemplates(false);
    setSelectedTemplate(null);
  }, []);

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter a subscription name");
      return false;
    }
    if (!formData.provider.trim()) {
      Alert.alert("Error", "Please enter a provider name");
      return false;
    }
    if (!formData.cost || isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) <= 0) {
      Alert.alert("Error", "Please enter a valid cost amount");
      return false;
    }
    if (!formData.startDate) {
      Alert.alert("Error", "Please select a start date");
      return false;
    }
    return true;
  };

  const createUserSubscription = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    hapticFeedback.formSubmit();
    
    try {
      const costInCents = Math.round(parseFloat(formData.cost) * 100);
      
      await createSubscription({
        name: formData.name.trim(),
        provider: formData.provider.trim(),
        description: formData.description.trim(),
        cost: costInCents,
        currency: formData.currency,
        billingCycle: formData.billingCycle as any,
        startDate: formData.startDate,
        renewalDate: formData.renewalDate,
        category: formData.category as any,
        iconUrl: formData.iconUrl,
        websiteUrl: formData.websiteUrl,
        supportUrl: formData.supportUrl,
        reminderEnabled: formData.reminderEnabled,
        reminderDaysBefore: formData.reminderDaysBefore,
      });
      
      hapticFeedback.success();
      navigation.navigate("SubscriptionDashboardScreen");
    } catch (error) {
      hapticFeedback.error();
      Alert.alert("Error", "Failed to create subscription. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getCategoryData = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[categories.length - 1];
  };

  const getBillingCycleData = (cycleId) => {
    return billingCycles.find(cycle => cycle.id === cycleId) || billingCycles[0];
  };

  const getCurrencyData = (currencyId) => {
    return currencies.find(currency => currency.id === currencyId) || currencies[0];
  };

  const renderTemplateItem = ({ item }) => (
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => handleTemplateSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.templateHeader}>
        <View style={[styles.templateIcon, { backgroundColor: getCategoryData(item.category).color }]}>
          <MaterialIcons name={getCategoryData(item.category).icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.templateInfo}>
          <Text variant="h6" style={styles.templateName}>{item.name}</Text>
          <Text variant="body2" color="secondary" style={styles.templateProvider}>{item.provider}</Text>
        </View>
      </View>
      <View style={styles.templateCosts}>
        {item.commonCosts.slice(0, 2).map((cost, index) => (
          <Text key={index} variant="body" weight="semibold" color="primary" style={styles.templateCost}>
            ${(cost.amount / 100).toFixed(2)}/{cost.billingCycle}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (showTemplates) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
            source={require("../assets/icons/logo2small.png")}
          style={styles.logo}
        />
      </View>

      <View style={styles.underHeaderContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            style={styles.arrowBack}
            source={require("../assets/icons/arrow-back.png")}
          />
        </TouchableOpacity>
          <Text variant="h4" style={styles.title}>Add Subscription</Text>
          <View style={styles.arrowBack} />
        </View>

        <ScrollView style={styles.templatesContainer}>
          <Button
            title="Add Custom Subscription"
            variant="outline"
            size="large"
            onPress={handleCustomSubscription}
            style={styles.customButton}
            accessibilityLabel="Add custom subscription"
            accessibilityHint="Double tap to create a custom subscription"
          />

          <Text variant="h5" style={styles.sectionTitle}>Popular Services</Text>
          <Text variant="body2" color="secondary" style={styles.sectionSubtitle}>Select a service to get started quickly</Text>
          
          <FlatList
            data={subscriptionTemplates}
            renderItem={renderTemplateItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.templatesList}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../assets/icons/logo2small.png")}
          style={styles.logo}
        />
      </View>

      <View style={styles.underHeaderContainer}>
        <TouchableOpacity onPress={() => setShowTemplates(true)}>
          <Image
            style={styles.arrowBack}
            source={require("../assets/icons/arrow-back.png")}
          />
        </TouchableOpacity>
        <Text variant="h4" style={styles.title}>
          {isUsingTemplate ? selectedTemplate?.name : "Custom Subscription"}
        </Text>
        <View style={styles.arrowBack} />
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.formContainer}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text variant="h5" style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text variant="body2" weight="semibold" style={styles.inputLabel}>Service Name *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(val) => updateFormData("name", val)}
                style={styles.inputField}
                placeholder="Netflix, Spotify, etc."
                placeholderTextColor="#A9A9A9"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="body2" weight="semibold" style={styles.inputLabel}>Provider *</Text>
          <TextInput
                value={formData.provider}
                onChangeText={(val) => updateFormData("provider", val)}
            style={styles.inputField}
                placeholder="Netflix Inc., Spotify AB, etc."
            placeholderTextColor="#A9A9A9"
          />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="body2" weight="semibold" style={styles.inputLabel}>Description</Text>
          <TextInput
                value={formData.description}
                onChangeText={(val) => updateFormData("description", val)}
                style={[styles.inputField, styles.textArea]}
            multiline
                placeholder="Optional notes about this subscription"
            placeholderTextColor="#A9A9A9"
          />
        </View>
          </View>

          {/* Cost Information */}
          <View style={styles.section}>
            <Text variant="h5" style={styles.sectionTitle}>Cost Information</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text variant="body2" weight="semibold" style={styles.inputLabel}>Cost *</Text>
                <TextInput
                  value={formData.cost}
                  onChangeText={(val) => updateFormData("cost", val)}
                  style={styles.inputField}
                  placeholder="9.99"
                  placeholderTextColor="#A9A9A9"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Currency</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={styles.selectText}>
                    {getCurrencyData(formData.currency).symbol} {formData.currency}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Billing Cycle</Text>
              <TouchableOpacity
                style={styles.selectField}
                onPress={() => setShowBillingModal(true)}
              >
                <Text style={styles.selectText}>
                  {getBillingCycleData(formData.billingCycle).name}
        </Text>
                <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Start Date *</Text>
                <TextInput
                  value={formData.startDate}
                  onChangeText={(val) => updateFormData("startDate", val)}
                  style={styles.inputField}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A9A9A9"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Next Renewal</Text>
                <TextInput
                  value={formData.renewalDate}
                  style={[styles.inputField, styles.disabledField]}
                  editable={false}
                  placeholder="Auto-calculated"
                  placeholderTextColor="#A9A9A9"
                />
              </View>
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.categoryDisplay}>
                <View style={[styles.categoryIcon, { backgroundColor: getCategoryData(formData.category).color }]}>
                  <MaterialIcons name={getCategoryData(formData.category).icon as any} size={20} color="#fff" />
                </View>
                <Text style={styles.categoryText}>{getCategoryData(formData.category).name}</Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Reminders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            <View style={styles.reminderRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => updateFormData("reminderEnabled", !formData.reminderEnabled)}
              >
                {formData.reminderEnabled && (
                  <AntDesign name="check" size={16} color="#0D87E1" />
                )}
              </TouchableOpacity>
              <Text style={styles.reminderText}>
                Remind me {formData.reminderDaysBefore} days before renewal
            </Text>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Modals */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateFormData("category", item.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={[styles.modalIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {formData.category === item.id && (
                    <MaterialIcons name="check" size={24} color="#0D87E1" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showBillingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Billing Cycle</Text>
            <FlatList
              data={billingCycles}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateFormData("billingCycle", item.id);
                    setShowBillingModal(false);
                  }}
                >
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemDesc}>{item.description}</Text>
                  </View>
                  {formData.billingCycle === item.id && (
                    <MaterialIcons name="check" size={24} color="#0D87E1" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowBillingModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <FlatList
              data={currencies}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateFormData("currency", item.id);
                    setShowCurrencyModal(false);
                  }}
                >
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemText}>{item.symbol} {item.name}</Text>
                  </View>
                  {formData.currency === item.id && (
                    <MaterialIcons name="check" size={24} color="#0D87E1" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Animated.View
        style={[
          styles.createButtonContainer,
          { transform: [{ translateY: footerTranslateY }] },
        ]}
      >
        <Button
          title="Add Subscription"
          variant="primary"
          size="large"
          onPress={createUserSubscription}
          disabled={isCreating}
          loading={isCreating}
          style={styles.createButton}
          accessibilityLabel="Create subscription"
          accessibilityHint="Double tap to create the subscription"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
  },
  header: {
    backgroundColor: theme.colors.primary[500],
    height: 67,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 20,
    resizeMode: "contain",
  },
  underHeaderContainer: {
    width: width,
    height: 62,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
  },
  arrowBack: {
    width: 20,
    height: 20,
  },
  title: {
    // Styles handled by Text component
  },
  // Templates Screen
  templatesContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
  },
  sectionTitle: {
    marginBottom: theme.spacing[2],
    paddingHorizontal: theme.spacing[5],
    marginTop: theme.spacing[6],
  },
  sectionSubtitle: {
    marginBottom: theme.spacing[5],
    paddingHorizontal: theme.spacing[5],
  },
  templatesList: {
    paddingHorizontal: theme.spacing[5],
  },
  templateItem: {
    backgroundColor: theme.colors.background.card,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    elevation: 4,
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    marginBottom: theme.spacing[1],
  },
  templateProvider: {
    // Styles handled by Text component
  },
  templateCosts: {
    flexDirection: "row",
    gap: 12,
  },
  templateCost: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.base,
  },
  customButton: {
    marginHorizontal: theme.spacing[5],
    marginVertical: theme.spacing[5],
  },
  // customButtonText styles removed - using Button component
  // Form Screen
  formContainer: {
    padding: theme.spacing[5],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  inputGroup: {
    marginBottom: theme.spacing[4],
  },
  inputLabel: {
    marginBottom: theme.spacing[2],
  },
  inputField: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[3],
    fontSize: theme.typography.size.base,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  disabledField: {
    backgroundColor: "#F9FAFB",
    color: "#9CA3AF",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  selectField: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: RFValue(14),
    fontFamily: "MRegular",
    color: "#2D2D2D",
  },
  categorySelector: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryText: {
    fontSize: RFValue(14),
    fontFamily: "MRegular",
    color: "#2D2D2D",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#0D87E1",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reminderText: {
    fontSize: RFValue(14),
    fontFamily: "MRegular",
    color: "#2D2D2D",
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontFamily: "MMedium",
    color: "#2D2D2D",
    marginBottom: 20,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemText: {
    fontSize: RFValue(16),
    fontFamily: "MRegular",
    color: "#2D2D2D",
  },
  modalItemDesc: {
    fontSize: RFValue(12),
    fontFamily: "MRegular",
    color: "#666",
    marginTop: 2,
  },
  modalClose: {
    backgroundColor: "#0D87E1",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: RFValue(16),
    fontFamily: "MMedium",
  },
  // Footer
  createButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  createButton: {
    width: width * 0.7,
  },
  // createButtonDisabled and createButtonText styles removed - using Button component
});
