import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery } from "convex/react";
// Design System Imports
import Text from "../components/ui/Text";
import Card from "../components/ui/Card";
import { theme } from "../theme/theme";
import { hapticFeedback } from "../utils/haptics";

const { width } = Dimensions.get("window");

const AnalyticsScreen = ({ navigation }) => {
  const user = useUser();
  const firstName = user?.user?.firstName;
  
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  
  const detailedAnalytics = useQuery(api.subscriptions.getDetailedAnalytics);
  const spendingInsights = useQuery(api.subscriptions.getSpendingInsights);

  const formatCurrency = (cents, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      entertainment: "tv",
      productivity: "work",
      gaming: "sports-esports",
      education: "school",
      health: "favorite",
      finance: "account-balance",
      utilities: "electrical-services",
      news: "article",
      social: "people",
      other: "category"
    };
    return icons[category] || "category";
  };

  const getCategoryColor = (category) => {
    const colors = {
      entertainment: theme.colors.error[500],
      productivity: theme.colors.secondary[500],
      gaming: theme.colors.info[500],
      education: theme.colors.success[500],
      health: theme.colors.warning[500],
      finance: "#DDA0DD",
      utilities: "#98D8C8",
      news: "#F7DC6F",
      social: "#BB8FCE",
      other: theme.colors.neutral[500]
    };
    return colors[category] || theme.colors.neutral[500];
  };

  const getUsageColor = (frequency) => {
    const colors = {
      daily: theme.colors.success[500],
      weekly: theme.colors.success[600],
      monthly: theme.colors.warning[500],
      rarely: theme.colors.warning[600],
      never: theme.colors.error[500],
      unknown: theme.colors.neutral[500]
    };
    return colors[frequency] || theme.colors.neutral[500];
  };

  const getUsageIcon = (frequency) => {
    const icons = {
      daily: "trending-up",
      weekly: "timeline",
      monthly: "calendar-today",
      rarely: "trending-down",
      never: "block",
      unknown: "help"
    };
    return icons[frequency] || "help";
  };

  const getInsightIcon = (type) => {
    const icons = {
      warning: "warning",
      info: "info",
      tip: "lightbulb"
    };
    return icons[type] || "info";
  };

  const renderOverviewCard = ({ title, value, subtitle, icon, color }) => (
    <Card style={{ marginBottom: theme.spacing[3], borderLeftWidth: 4, borderLeftColor: color }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] }}>
        <MaterialIcons name={icon} size={24} color={color} />
        <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[2] }}>{title}</Text>
      </View>
      <Text variant="h3" weight="bold" style={{ color: color, marginBottom: theme.spacing[1] }}>{value}</Text>
      {subtitle && <Text variant="caption" color="secondary">{subtitle}</Text>}
    </Card>
  );

  const renderCategoryItem = ({ item }) => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: theme.spacing[3], 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border.light 
    }}>
      <View style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: getCategoryColor(item.category) + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing[3]
      }}>
        <MaterialIcons name={getCategoryIcon(item.category)} size={20} color={getCategoryColor(item.category)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium">{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
        <Text variant="body" weight="semibold" style={{ color: theme.colors.primary[500] }}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="caption" weight="medium" style={{ color: theme.colors.success[500] }}>
          {((item.amount / (detailedAnalytics?.monthlyTotal || 1)) * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  const renderUsageItem = ({ item }) => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: theme.spacing[3], 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border.light 
    }}>
      <View style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: getUsageColor(item.frequency) + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing[3]
      }}>
        <MaterialIcons name={getUsageIcon(item.frequency)} size={20} color={getUsageColor(item.frequency)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium">{item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}</Text>
        <Text variant="body" color="secondary">{item.count} subscription{item.count > 1 ? 's' : ''}</Text>
      </View>
    </View>
  );

  const renderExpensiveItem = ({ item }) => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: theme.spacing[3], 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border.light 
    }}>
      <View style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: getCategoryColor(item.category) + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing[3]
      }}>
        <MaterialIcons name={getCategoryIcon(item.category)} size={20} color={getCategoryColor(item.category)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium">{item.name}</Text>
        <Text variant="caption" color="secondary">{item.provider}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="body" weight="semibold" style={{ color: theme.colors.error[500] }}>
          {formatCurrency(item.monthlyCost)}
        </Text>
        <Text variant="caption" color="secondary">per month</Text>
      </View>
    </View>
  );

  const renderInsightItem = ({ item }) => (
    <Card style={{ marginBottom: theme.spacing[3], borderLeftWidth: 4, borderLeftColor: item.color }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] }}>
        <MaterialIcons name={getInsightIcon(item.type)} size={20} color={item.color} />
        <Text variant="body" weight="medium" style={{ marginLeft: theme.spacing[2] }}>{item.title}</Text>
      </View>
      <Text variant="body" color="secondary">{item.message}</Text>
    </Card>
  );

  const renderTrendPoint = ({ item, index }) => (
    <View style={{ alignItems: 'center', marginRight: theme.spacing[4] }}>
      <View style={{ 
        width: 20, 
        height: Math.max(20, (item.amount / (detailedAnalytics?.monthlyTotal || 1)) * 100),
        backgroundColor: theme.colors.primary[500],
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing[2]
      }} />
      <Text variant="caption" color="secondary">{item.month}</Text>
      <Text variant="caption" weight="medium">{formatCurrency(item.amount)}</Text>
    </View>
  );

  if (!detailedAnalytics || !spendingInsights) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background.primary }}>
        <Text variant="body" color="secondary">Loading analytics...</Text>
      </View>
    );
  }

  const categoryData = Object.entries(detailedAnalytics.categoryBreakdown).map(([category, amount]) => ({
    category,
    amount,
  })).sort((a, b) => b.amount - a.amount);

  const usageData = Object.entries(detailedAnalytics.usageAnalysis).map(([frequency, count]) => ({
    frequency,
    count,
  })).sort((a, b) => b.count - a.count);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} showsVerticalScrollIndicator={false}>
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
        <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing[3] }}>Analytics</Text>
      </View>

      <View style={{ padding: theme.spacing[5] }}>
        {/* Overview Cards */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          {renderOverviewCard({
            title: "Monthly Total",
            value: formatCurrency(detailedAnalytics.monthlyTotal),
            subtitle: `${formatCurrency(detailedAnalytics.yearlyTotal)} per year`,
            icon: "attach-money",
            color: theme.colors.success[500]
          })}
          
          {renderOverviewCard({
            title: "Active Subscriptions",
            value: detailedAnalytics.totalSubscriptions.toString(),
            subtitle: `${detailedAnalytics.cancelledSubscriptions} cancelled`,
            icon: "subscriptions",
            color: theme.colors.primary[500]
          })}
          
          {renderOverviewCard({
            title: "Average per Service",
            value: formatCurrency(detailedAnalytics.averagePerSubscription),
            subtitle: "Monthly average cost",
            icon: "trending-up",
            color: theme.colors.warning[500]
          })}
        </View>

        {/* Spending Trend */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Spending Trend</Text>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: theme.spacing[3] }}>
              {detailedAnalytics.spendingTrend.map((item, index) => (
                <View key={index} style={{ alignItems: 'center', marginRight: theme.spacing[4] }}>
                  <View style={{ 
                    width: 20, 
                    height: Math.max(20, (item.amount / Math.max(...detailedAnalytics.spendingTrend.map(t => t.amount))) * 80),
                    backgroundColor: theme.colors.primary[500],
                    borderRadius: theme.borderRadius.sm,
                    marginBottom: theme.spacing[2]
                  }} />
                  <Text variant="caption" color="secondary">{item.month}</Text>
                  <Text variant="caption" weight="medium">{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </ScrollView>
          </Card>
        </View>

        {/* Category Breakdown */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Category Breakdown</Text>
          <Card>
            <FlatList
              data={categoryData}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.category}
              scrollEnabled={false}
            />
          </Card>
        </View>

        {/* Usage Analysis */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Usage Analysis</Text>
          <Card>
            <FlatList
              data={usageData}
              renderItem={renderUsageItem}
              keyExtractor={(item) => item.frequency}
              scrollEnabled={false}
            />
          </Card>
        </View>

        {/* Most Expensive Services */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Most Expensive Services</Text>
          <Card>
            <FlatList
              data={(detailedAnalytics as any).mostExpensiveServices || []}
              renderItem={renderExpensiveItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          </Card>
        </View>

        {/* Spending Insights */}
        <View style={{ marginBottom: theme.spacing[5] }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Spending Insights</Text>
          <FlatList
            data={spendingInsights}
            renderItem={renderInsightItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});

export default AnalyticsScreen; 