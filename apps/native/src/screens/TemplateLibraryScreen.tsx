import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { Text } from '../components/ui';
import { theme } from '../theme/theme';
import { hapticFeedback } from '../utils/haptics';

export default function TemplateLibraryScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const searchInputRef = React.useRef<TextInput>(null);

  // Simple animation values
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Trigger animations on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim]);

  // Get all templates without filtering
  const allTemplates = useQuery(api.subscriptions.getTemplates, {});

  // Local filtering to prevent re-renders
  const filteredTemplates = useMemo(() => {
    if (!allTemplates) return [];
    
    let filtered = allTemplates;
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(template => 
        template.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Filter by search
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.provider.toLowerCase().includes(searchTerm) ||
        template.category.toLowerCase().includes(searchTerm)
      );
    }
    
    return filtered;
  }, [allTemplates, selectedCategory, searchQuery]);

  const createFromTemplate = useMutation(api.subscriptions.createFromTemplate);

  const categories = useMemo(() => [
    { id: null, name: 'All', icon: 'grid-outline' },
    { id: 'entertainment', name: 'Entertainment', icon: 'play-outline' },
    { id: 'productivity', name: 'Productivity', icon: 'briefcase-outline' },
    { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline' },
    { id: 'education', name: 'Education', icon: 'school-outline' },
    { id: 'health', name: 'Health', icon: 'fitness-outline' },
    { id: 'finance', name: 'Finance', icon: 'card-outline' },
    { id: 'utilities', name: 'Utilities', icon: 'settings-outline' },
  ], []);

  const formatCurrency = (cents: number, currency = "USD") => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(dollars);
  };

  const handleTemplateSelect = useCallback((template: any) => {
    hapticFeedback.cardSelect();
    setSelectedTemplate(template);
    setShowPlanSelector(true);
  }, []);

  const handlePlanSelect = useCallback(async (planIndex: number) => {
    if (!selectedTemplate) return;

    try {
      hapticFeedback.add();
      await createFromTemplate({
        templateId: selectedTemplate._id,
        planIndex,
      });

      hapticFeedback.success();
      Alert.alert(
        'Success!',
        `${selectedTemplate.name} has been added to your subscriptions.`,
        [
          {
            text: 'View Subscriptions',
            onPress: () => navigation.navigate('SubscriptionDashboardScreen'),
          },
          {
            text: 'Add Another',
            style: 'cancel',
          },
        ]
      );

      setShowPlanSelector(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error creating subscription:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to add subscription. Please try again.');
    }
  }, [selectedTemplate, createFromTemplate, navigation]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[5],
      paddingTop: 60,
      paddingBottom: theme.spacing[5],
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
      ...theme.shadows.sm,
    },
    backButton: {
      padding: theme.spacing[2],
    },
    headerTitle: {
      // Styles handled by Text component
    },
    placeholder: {
      width: 40,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      backgroundColor: theme.colors.background.primary,
    },
    searchInput: {
      backgroundColor: theme.colors.background.tertiary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      fontSize: theme.typography.size.base,
      color: theme.colors.text.primary,
      elevation: 2,
      shadowColor: theme.colors.shadow.light,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    categoriesContainer: {
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      backgroundColor: theme.colors.background.primary,
    },
    categoriesTitle: {
      marginBottom: theme.spacing[3],
    },
    categoriesScrollView: {
      flexDirection: 'row',
    },
    categoryButton: {
      alignItems: 'center',
      marginRight: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.background.tertiary,
      minWidth: 90,
      elevation: 2,
      shadowColor: theme.colors.shadow.light,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary[500],
    },
    categoryIcon: {
      marginBottom: theme.spacing[1],
    },
    categoryText: {
      // Styles handled by Text component
    },
    templatesContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[4],
    },
    templateCard: {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[5],
      marginBottom: theme.spacing[4],
      elevation: 4,
      shadowColor: theme.colors.shadow.medium,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    templateIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.base,
      marginRight: theme.spacing[3],
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
    templateCategory: {
      backgroundColor: theme.colors.primary[50],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.full,
      alignSelf: 'flex-start',
      marginBottom: theme.spacing[3],
    },


    planSelectorModal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.modal,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    planSelectorContent: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[7],
      marginHorizontal: theme.spacing[5],
      maxWidth: 400,
      width: '100%',
      elevation: 8,
      shadowColor: theme.colors.shadow.dark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    planSelectorTitle: {
      marginBottom: theme.spacing[4],
    },
    planOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing[5],
      paddingHorizontal: theme.spacing[5],
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background.tertiary,
      marginBottom: theme.spacing[4],
      elevation: 2,
      shadowColor: theme.colors.shadow.light,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    planOptionInfo: {
      flex: 1,
    },
    planOptionName: {
      marginBottom: theme.spacing[1],
    },
    planOptionPrice: {
      // Styles handled by Text component
    },
    addButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow.medium,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
    },
    addButtonText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.size.base,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing[4],
      right: theme.spacing[4],
      padding: theme.spacing[2],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing[12],
    },
    emptyIcon: {
      marginBottom: theme.spacing[4],
    },
    emptyTitle: {
      marginBottom: theme.spacing[2],
    },
    emptyText: {
      paddingHorizontal: theme.spacing[6],
    },
    plansContainer: {
      marginTop: theme.spacing[3],
    },
    planItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      backgroundColor: theme.colors.background.tertiary,
      borderRadius: theme.borderRadius.base,
      marginBottom: theme.spacing[2],
    },
    planInfo: {
      flex: 1,
    },
    planName: {
      marginBottom: theme.spacing[1],
    },
    planPrice: {
      // Styles handled by Text component
    },
  });

  if (allTemplates === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text variant="body2" color="secondary" style={{ marginTop: theme.spacing[4] }}>
          Loading templates...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.navigation();
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <Text variant="h5" style={styles.headerTitle}>Template Library</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { transform: [{ translateY: slideAnim }] }]}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.text.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </Animated.View>

      {/* Categories */}
      <Animated.View style={[styles.categoriesContainer, { transform: [{ translateY: slideAnim }] }]}>
        <Text variant="h6" style={styles.categoriesTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScrollView}
        >
          {categories.map((category, index) => (
            <View key={category.id}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  setSelectedCategory(category.id);
                }}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={selectedCategory === category.id ? theme.colors.text.inverse : theme.colors.text.tertiary}
                  style={styles.categoryIcon}
                />
                <Text
                  variant="caption"
                  color={selectedCategory === category.id ? 'inverse' : 'tertiary'}
                  align="center"
                  style={styles.categoryText}
                >
                  {category.name}
                </Text>
                              </TouchableOpacity>
              </View>
            ))}
        </ScrollView>
      </Animated.View>

      {/* Templates */}
      <ScrollView style={styles.templatesContainer}>
        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={64}
              color={theme.colors.neutral[400]}
              style={styles.emptyIcon}
            />
            <Text variant="h5" style={styles.emptyTitle}>No templates found</Text>
            <Text variant="body2" color="secondary" align="center" style={styles.emptyText}>
              Try adjusting your search or category filter to find more templates.
            </Text>
          </View>
        ) : (
          filteredTemplates.map((template, index) => (
            <TouchableOpacity
              key={template._id}
              style={styles.templateCard}
              onPress={() => handleTemplateSelect(template)}
            >
                              <View style={styles.templateHeader}>
                  {template.iconUrl ? (
                    <Image
                      source={{ uri: template.iconUrl }}
                      style={styles.templateIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.templateIcon, { backgroundColor: theme.colors.background.tertiary }]}>
                      <Ionicons name="business-outline" size={24} color={theme.colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.templateInfo}>
                    <Text variant="h6" style={styles.templateName}>{template.name}</Text>
                    <Text variant="body2" color="secondary" style={styles.templateProvider}>{template.provider}</Text>
                  </View>
                </View>

                <Text variant="caption" color="primary" style={styles.templateCategory}>
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </Text>

              <View style={styles.plansContainer}>
                {template.commonCosts.slice(0, 2).map((plan: any, index: number) => (
                  <View key={index} style={styles.planItem}>
                    <View style={styles.planInfo}>
                      <Text variant="body2" style={styles.planName}>{plan.planName}</Text>
                    </View>
                    <Text variant="body" weight="semibold" color="primary" style={styles.planPrice}>
                      {formatCurrency(plan.amount, plan.currency)}/{plan.billingCycle}
                    </Text>
                  </View>
                ))}
                {template.commonCosts.length > 2 && (
                  <Text variant="caption" color="tertiary" style={{ marginTop: theme.spacing[1] }}>
                    +{template.commonCosts.length - 2} more plans
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Plan Selector Modal */}
      {showPlanSelector && selectedTemplate && (
        <View style={styles.planSelectorModal}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              hapticFeedback.cancel();
              setShowPlanSelector(false);
              setSelectedTemplate(null);
            }}
          >
            <View style={styles.planSelectorContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  hapticFeedback.cancel();
                  setShowPlanSelector(false);
                  setSelectedTemplate(null);
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>

              <Text variant="h4" align="center" style={styles.planSelectorTitle}>
                Choose {selectedTemplate.name} Plan
              </Text>

              {selectedTemplate.commonCosts.map((plan: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.planOption}
                  onPress={() => handlePlanSelect(index)}
                >
                  <View style={styles.planOptionInfo}>
                                          <Text variant="h6" style={styles.planOptionName}>{plan.planName}</Text>
                      <Text variant="body2" color="secondary" style={styles.planOptionPrice}>
                        {formatCurrency(plan.amount, plan.currency)}/{plan.billingCycle}
                      </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handlePlanSelect(index)}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
} 