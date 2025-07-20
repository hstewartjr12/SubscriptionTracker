import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ScrollView,
} from "react-native";
import { Feather, AntDesign, MaterialIcons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery } from "convex/react";

// Design System Imports
import Text from "../components/ui/Text";
import Button from "../components/ui/Button";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

const NotesDashboardScreen = ({ navigation }) => {
  const user = useUser();
  const imageUrl = user?.user?.imageUrl;
  const firstName = user?.user?.firstName;

  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Animation hooks - disabled for now to avoid conflicts
  
  const allSubscriptions = useQuery(api.subscriptions.getSubscriptions, { 
    status: "active",
    category: selectedCategory === "all" ? undefined : selectedCategory
  });
  const dashboardData = useQuery(api.subscriptions.getDashboardData);
  const upcomingRenewals = useQuery(api.subscriptions.getUpcomingRenewals, { daysAhead: 7 });
  const notificationCount = useQuery(api.subscriptions.getNotificationCount);
  const settings = useQuery(api.subscriptions.getSettings);
  
  const [search, setSearch] = useState("");

  const categories = useMemo(() => [
    { id: "all", name: "All", icon: "dashboard", color: "#6B73FF" },
    { id: "entertainment", name: "Entertainment", icon: "tv", color: "#FF6B6B" },
    { id: "productivity", name: "Productivity", icon: "work", color: "#4ECDC4" },
    { id: "gaming", name: "Gaming", icon: "sports-esports", color: "#45B7D1" },
    { id: "education", name: "Education", icon: "school", color: "#96CEB4" },
    { id: "health", name: "Health", icon: "favorite", color: "#FFEAA7" },
    { id: "finance", name: "Finance", icon: "account-balance", color: "#DDA0DD" },
    { id: "utilities", name: "Utilities", icon: "settings", color: "#98D8C8" },
    { id: "news", name: "News", icon: "article", color: "#F7DC6F" },
    { id: "social", name: "Social", icon: "people", color: "#BB8FCE" },
    { id: "other", name: "Other", icon: "category", color: "#AED6F1" },
  ], []);

  const finalSubscriptions = useMemo(() => {
    if (!allSubscriptions) return [];
    return search
      ? allSubscriptions.filter(
          (subscription) =>
            subscription.name.toLowerCase().includes(search.toLowerCase()) ||
            subscription.provider.toLowerCase().includes(search.toLowerCase()) ||
            subscription.category.toLowerCase().includes(search.toLowerCase()),
        )
      : allSubscriptions;
  }, [allSubscriptions, search]);

  const formatCurrency = useCallback((cents, currency = "USD") => {
    const showCents = settings?.showCostInCents ?? false;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(cents / 100);
  }, [settings?.showCostInCents]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const getCategoryIcon = useCallback((category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.icon : "category";
  }, [categories]);

  const getCategoryColor = useCallback((category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.color : "#AED6F1";
  }, [categories]);

  const getCategoryName = useCallback((category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.name : "Other";
  }, [categories]);

  const getCategoryBreakdown = useMemo(() => {
    if (!dashboardData?.categoryBreakdown) return [];
    
    return Object.entries(dashboardData.categoryBreakdown).map(([category, amount]) => ({
      category,
      amount,
      name: getCategoryName(category),
      color: getCategoryColor(category),
      icon: getCategoryIcon(category),
    })).sort((a, b) => b.amount - a.amount);
  }, [dashboardData?.categoryBreakdown, getCategoryName, getCategoryColor, getCategoryIcon]);

  const handleCategorySelect = useCallback((categoryId) => {
    hapticFeedback.cardSelect();
    setSelectedCategory(categoryId);
  }, []);

  const renderCategoryFilter = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
        { borderColor: item.color }
      ]}
      onPress={() => handleCategorySelect(item.id)}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={item.icon} 
        size={16} 
        color={selectedCategory === item.id ? "#fff" : item.color} 
        style={{ marginRight: 8 }}
      />
      <Text 
        variant="body2" 
        weight={selectedCategory === item.id ? "semibold" : "normal"}
        style={{
          ...styles.categoryChipText,
          color: selectedCategory === item.id ? "#fff" : item.color
        }}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  ), [selectedCategory, handleCategorySelect]);

  const renderCategoryBreakdown = useCallback(({ item }) => (
    <View style={styles.categoryBreakdownItem}>
      <View style={[styles.categoryBreakdownIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.categoryBreakdownInfo}>
        <Text variant="body" style={styles.categoryBreakdownName}>{item.name}</Text>
        <Text variant="body" weight="semibold" color="primary" style={styles.categoryBreakdownAmount}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  ), [formatCurrency]);

  const handleSubscriptionPress = useCallback((subscription) => {
    hapticFeedback.cardSelect();
    navigation.navigate("SubscriptionDetailScreen", {
      subscription: subscription,
    });
  }, [navigation]);

  const renderSubscriptionItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.subscriptionItem, { 
        backgroundColor: theme.colors.background.card, 
        borderRadius: theme.borderRadius.lg, 
        elevation: 4, 
        shadowColor: theme.colors.shadow.medium, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 1, 
        shadowRadius: 4, 
        marginBottom: theme.spacing[3],
        padding: theme.spacing[4],
        minHeight: 100
      }]}
      onPress={() => handleSubscriptionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.subscriptionHeader}>
        <View style={styles.subscriptionInfo}>
          <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.category) }]}>
            <MaterialIcons name={getCategoryIcon(item.category) as any} size={16} color="#fff" />
          </View>
          <View style={styles.subscriptionDetails}>
            <Text variant="h6" style={styles.subscriptionName}>{item.name}</Text>
            <Text variant="body2" color="secondary" style={styles.subscriptionProvider}>{item.provider}</Text>
          </View>
        </View>
        <View style={styles.subscriptionCost}>
          <Text variant="h6" weight="semibold" color="primary" style={styles.costAmount}>
            {formatCurrency(item.cost, item.currency)}
          </Text>
          <Text variant="body2" color="secondary" style={styles.costFrequency}>/{item.billingCycle}</Text>
        </View>
      </View>
      <View style={styles.subscriptionFooter}>
        <Text variant="body2" color="secondary" style={styles.renewalDate}>
          Renews {formatDate(item.renewalDate)}
        </Text>
        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
          <Text variant="caption" color="secondary">
            {getCategoryName(item.category)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [handleSubscriptionPress, getCategoryColor, getCategoryIcon, formatCurrency, formatDate, getCategoryName]);

  const renderUpcomingRenewal = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.renewalItem}
      onPress={() => handleSubscriptionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.renewalInfo}>
        <Text variant="body" weight="semibold" style={styles.renewalName}>{item.name}</Text>
        <Text variant="body2" color="secondary" style={styles.renewalDate}>{formatDate(item.renewalDate)}</Text>
      </View>
      <Text variant="body" weight="semibold" color="primary" style={styles.renewalCost}>
        {formatCurrency(item.cost, item.currency)}
      </Text>
    </TouchableOpacity>
  ), [handleSubscriptionPress, formatDate, formatCurrency]);

  // Key extractors for FlatList optimization
  const keyExtractor = useCallback((item) => item._id, []);
  const categoryKeyExtractor = useCallback((item) => item.id, []);
  const breakdownKeyExtractor = useCallback((item) => item.category, []);
  const renewalKeyExtractor = useCallback((item) => item._id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate("NotificationSettingsScreen");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.notificationIconContainer}>
              <MaterialIcons name="notifications" size={24} color="#fff" />
            </View>
            {notificationCount && notificationCount.unread > 0 && (
              <View style={styles.notificationBadge}>
                <Text variant="caption" weight="semibold" style={styles.notificationBadgeText}>
                  {notificationCount.unread > 9 ? '9+' : notificationCount.unread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate("AnalyticsScreen");
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="assessment" size={24} color="#6B73FF" />
            <Text variant="body2" weight="semibold" style={styles.analyticsButtonText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.consolidationButton}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate("ConsolidationScreen");
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="call-merge" size={24} color="#4ECDC4" />
            <Text variant="body2" weight="semibold" style={styles.consolidationButtonText}>Consolidate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              hapticFeedback.buttonPress();
              navigation.navigate("SettingsScreen");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIconContainer}>
              <MaterialIcons name="settings" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Header */}
        <View style={styles.userContainer}>
                      <View style={styles.userInfo}>
              <Text variant="h4" style={styles.greeting}>Hello, {firstName || "User"}!</Text>
              <Text variant="body2" color="secondary" style={styles.subtitle}>Manage your subscriptions</Text>
            </View>
            {imageUrl ? (
              <Image style={styles.avatar} source={{ uri: imageUrl }} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text variant="h5" weight="semibold" style={styles.avatarText}>{firstName ? firstName[0] : "U"}</Text>
              </View>
                      )}
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, { backgroundColor: theme.colors.background.card, borderRadius: theme.borderRadius.lg, elevation: 4, shadowColor: theme.colors.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 }]}>
            <Text variant="body2" color="secondary" style={styles.overviewLabel}>Monthly Total</Text>
            <Text variant="h4" weight="semibold" color="primary" style={styles.overviewValue}>
              {dashboardData ? formatCurrency(dashboardData.monthlyTotal) : "$0.00"}
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: theme.colors.background.card, borderRadius: theme.borderRadius.lg, elevation: 4, shadowColor: theme.colors.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 }]}>
            <Text variant="body2" color="secondary" style={styles.overviewLabel}>Active Subscriptions</Text>
            <Text variant="h4" weight="semibold" color="primary" style={styles.overviewValue}>
              {dashboardData ? dashboardData.totalSubscriptions : 0}
            </Text>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.section}>
          <Text variant="h5" style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryFilter}
            keyExtractor={categoryKeyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterList}
          />
        </View>

        {/* Category Breakdown */}
        {selectedCategory === "all" && getCategoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text variant="h5" style={styles.sectionTitle}>Spending by Category</Text>
            <View style={[styles.categoryBreakdownContainer, { backgroundColor: theme.colors.background.card, borderRadius: theme.borderRadius.lg, elevation: 4, shadowColor: theme.colors.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 }]}>
              {getCategoryBreakdown.slice(0, 3).map((item, index) => (
                <View key={item.category} style={styles.categoryBreakdownItem}>
                  <View style={[styles.categoryBreakdownIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={16} color="#fff" />
                  </View>
                  <View style={styles.categoryBreakdownInfo}>
                    <Text variant="body" style={styles.categoryBreakdownName}>{item.name}</Text>
                    <Text variant="body" weight="semibold" color="primary" style={styles.categoryBreakdownAmount}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Renewals */}
        {upcomingRenewals && upcomingRenewals.length > 0 && (
          <View style={styles.section}>
            <Text variant="h5" style={styles.sectionTitle}>Upcoming Renewals</Text>
            <FlatList
              data={upcomingRenewals}
              renderItem={renderUpcomingRenewal}
              keyExtractor={renewalKeyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.renewalsList}
            />
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={20}
            color="grey"
            style={styles.searchIcon}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search subscriptions..."
            style={styles.searchInput}
          />
          {selectedCategory !== "all" && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setSelectedCategory("all")}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Subscriptions List */}
        <View style={styles.subscriptionsSection}>
          <View style={styles.subscriptionsSectionHeader}>
            <Text variant="h5" style={styles.sectionTitle}>
              {selectedCategory === "all" 
                ? "Your Subscriptions" 
                : `${getCategoryName(selectedCategory)} Subscriptions`}
            </Text>
            {finalSubscriptions && finalSubscriptions.length > 0 && (
              <Text variant="body2" color="secondary" style={styles.subscriptionsCount}>
                {finalSubscriptions.length} subscription{finalSubscriptions.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          {!finalSubscriptions || finalSubscriptions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.background.card, borderRadius: theme.borderRadius.lg, elevation: 4, shadowColor: theme.colors.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 }]}>
              <MaterialIcons name="subscriptions" size={48} color={theme.colors.text.secondary} />
              <Text variant="body" color="secondary" style={styles.emptyStateText}>
                {selectedCategory === "all" 
                  ? "No subscriptions found\nAdd your first subscription to get started"
                  : `No ${getCategoryName(selectedCategory).toLowerCase()} subscriptions found\nTry a different category or add a new subscription`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={finalSubscriptions}
              renderItem={renderSubscriptionItem}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              contentContainerStyle={styles.subscriptionsList}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.buttonPress();
            navigation.navigate("TemplateLibraryScreen");
          }}
          style={[styles.quickAddButton, { backgroundColor: theme.colors.secondary[500] }]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="library-books" size={20} color="#fff" />
          <Text variant="body" weight="semibold" style={{ color: "#fff", marginLeft: 8 }}>
            Quick Add
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.buttonPress();
            navigation.navigate("CreateSubscriptionScreen");
          }}
          style={[styles.addButton, { backgroundColor: theme.colors.primary[500] }]}
          activeOpacity={0.8}
        >
          <AntDesign name="pluscircle" size={20} color="#fff" />
          <Text variant="body" weight="semibold" style={{ color: "#fff", marginLeft: 8 }}>
            Add Subscription
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    backgroundColor: theme.colors.primary[500],
    height: 67,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
  },
  logo: {
    // Removed - no longer used
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  notificationButton: {
    position: "relative",
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: theme.colors.error[500],
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: RFValue(11),
    fontFamily: "MMedium",
    textAlign: "center",
  },
  analyticsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  analyticsButtonText: {
    fontSize: RFValue(12),
    fontFamily: "MMedium",
    color: theme.colors.primary[500],
    marginLeft: 5,
  },
  consolidationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  consolidationButtonText: {
    fontSize: RFValue(12),
    fontFamily: "MMedium",
    color: theme.colors.secondary[500],
    marginLeft: 5,
  },
  settingsButton: {
    position: "relative",
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  settingsButtonText: {
    // Removed - no longer used
  },
  scrollView: {
    flex: 1,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[5],
    backgroundColor: theme.colors.background.card,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    // Styling handled by Text component
  },
  subtitle: {
    marginTop: theme.spacing[0.5],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
  },
  overviewContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[2.5],
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
  },
  overviewCard: {
    flex: 1,
    padding: theme.spacing[4],
  },
  overviewLabel: {
    marginBottom: theme.spacing[1],
  },
  overviewValue: {
    // Styling handled by Text component
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    paddingHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[3],
  },
  renewalsList: {
    paddingHorizontal: theme.spacing[5],
  },
  renewalItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 140,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  renewalInfo: {
    marginBottom: 8,
  },
  renewalName: {
    fontSize: RFValue(12),
    fontFamily: "MMedium",
    color: "#2D2D2D",
  },
  renewalDate: {
    fontSize: RFValue(10),
    fontFamily: "MRegular",
    color: "#666",
  },
  renewalCost: {
    fontSize: RFValue(14),
    fontFamily: "MMedium",
    color: "#0D87E1",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: RFValue(14),
    fontFamily: "MRegular",
    color: "#2D2D2D",
  },
  subscriptionsSection: {
    marginTop: 20,
    paddingBottom: 100,
  },
  subscriptionsList: {
    paddingHorizontal: theme.spacing[5],
  },
  subscriptionItem: {
    // Styling handled by Card component
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing[3],
  },
  subscriptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing[3],
  },
  subscriptionDetails: {
    flex: 1,
    marginRight: theme.spacing[2],
  },
  subscriptionName: {
    marginBottom: theme.spacing[1],
  },
  subscriptionProvider: {
    // Styling handled by Text component
  },
  subscriptionCost: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  costAmount: {
    // Styling handled by Text component
  },
  costFrequency: {
    // Styling handled by Text component
  },
  subscriptionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing[2],
  },
  subscriptionRenewalDate: {
    fontSize: RFValue(12),
    fontFamily: "MRegular",
    color: "#666",
  },
  categoryTag: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  emptyState: {
    padding: theme.spacing[10],
    alignItems: "center",
    marginHorizontal: theme.spacing[5],
    marginTop: theme.spacing[5],
  },
  emptyStateText: {
    textAlign: "center",
    marginTop: theme.spacing[3],
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[5],
    position: "absolute",
    bottom: theme.spacing[5],
    left: 0,
    right: 0,
  },
  quickAddButton: {
    flex: 1,
    marginRight: theme.spacing[2],
    flexDirection: "row",
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    elevation: 4,
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  addButton: {
    flex: 1,
    marginLeft: theme.spacing[2],
    flexDirection: "row",
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    elevation: 4,
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  categoryFilterList: {
    paddingHorizontal: theme.spacing[5],
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: theme.colors.background.primary,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  categoryChipText: {
    fontSize: RFValue(12),
    fontFamily: "MMedium",
  },
  categoryChipTextActive: {
    color: theme.colors.text.inverse,
  },
  categoryBreakdownContainer: {
    marginHorizontal: theme.spacing[5],
    padding: theme.spacing[4],
  },
  categoryBreakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  categoryBreakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  categoryBreakdownInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBreakdownName: {
    fontSize: RFValue(14),
    fontFamily: "MRegular",
    color: theme.colors.text.primary,
  },
  categoryBreakdownAmount: {
    fontSize: RFValue(14),
    fontFamily: "MMedium",
    color: theme.colors.primary[500],
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.error[500],
    borderRadius: 12,
    marginLeft: 8,
  },
  clearFilterText: {
    fontSize: RFValue(12),
    fontFamily: "MMedium",
    color: theme.colors.text.inverse,
  },
  subscriptionsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[3],
  },
  subscriptionsCount: {
    // Styling handled by Text component
  },
});

export default NotesDashboardScreen;
