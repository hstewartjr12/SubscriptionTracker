import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Auth } from "convex/server";
import { api } from "./_generated/api";

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

// SUBSCRIPTION QUERIES

// Get all subscriptions for a specific user
export const getSubscriptions = query({
  args: {
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("paused"),
      v.literal("trial")
    )),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    let subscriptionsQuery = ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId));

    // Use indexes for better performance
    if (args.status) {
      subscriptionsQuery = subscriptionsQuery.filter((q) => 
        q.eq(q.field("status"), args.status)
      );
    }

    if (args.category) {
      subscriptionsQuery = subscriptionsQuery.filter((q) => 
        q.eq(q.field("category"), args.category)
      );
    }

    const subscriptions = await subscriptionsQuery
      .order("desc")
      .collect();

    return subscriptions;
  },
});

// Get a specific subscription by ID
export const getSubscription = query({
  args: {
    id: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) return null;

    return subscription;
  },
});

// Get subscriptions with upcoming renewals
export const getUpcomingRenewals = query({
  args: {
    daysAhead: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + args.daysAhead);

    // Use index for better performance
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    return subscriptions
      .filter(sub => {
        const renewalDate = new Date(sub.renewalDate);
        return renewalDate >= today && renewalDate <= futureDate;
      })
      .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())
      .slice(0, 10); // Limit to top 10 for performance
  },
});

// Get subscription analytics data
export const getSubscriptionAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Calculate total monthly cost
    const monthlyTotal = subscriptions.reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      return total + monthlyCost;
    }, 0);

    // Group by category
    const categoryBreakdown = subscriptions.reduce((acc, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      acc[sub.category] = (acc[sub.category] || 0) + monthlyCost;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSubscriptions: subscriptions.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      categoryBreakdown,
      averagePerSubscription: subscriptions.length > 0 ? monthlyTotal / subscriptions.length : 0,
    };
  },
});

// Get detailed analytics for the analytics screen
export const getDetailedAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const allSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const activeSubscriptions = allSubscriptions.filter(sub => sub.status === "active");
    const cancelledSubscriptions = allSubscriptions.filter(sub => sub.status === "cancelled");

    // Calculate monthly costs for active subscriptions
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      return total + monthlyCost;
    }, 0);

    // Category breakdown
    const categoryBreakdown = activeSubscriptions.reduce((acc, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      acc[sub.category] = (acc[sub.category] || 0) + monthlyCost;
      return acc;
    }, {} as Record<string, number>);

    // Usage analysis
    const usageAnalysis = activeSubscriptions.reduce((acc, sub) => {
      const frequency = sub.usageFrequency || 'unknown';
      acc[frequency] = (acc[frequency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Billing cycle analysis
    const billingCycleAnalysis = activeSubscriptions.reduce((acc, sub) => {
      acc[sub.billingCycle] = (acc[sub.billingCycle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most expensive subscriptions
    const mostExpensive = activeSubscriptions
      .map(sub => ({
        name: sub.name,
        provider: sub.provider,
        category: sub.category,
        monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 :
                     sub.billingCycle === "quarterly" ? sub.cost / 3 :
                     sub.billingCycle === "biannual" ? sub.cost / 6 :
                     sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                     sub.cost,
        actualCost: sub.cost,
        billingCycle: sub.billingCycle,
        currency: sub.currency,
        usageFrequency: sub.usageFrequency || 'unknown'
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 5);

    // Underutilized subscriptions (low usage + high cost)
    const underutilized = activeSubscriptions
      .filter(sub => sub.usageFrequency === 'rarely' || sub.usageFrequency === 'never')
      .map(sub => ({
        name: sub.name,
        provider: sub.provider,
        category: sub.category,
        monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 :
                     sub.billingCycle === "quarterly" ? sub.cost / 3 :
                     sub.billingCycle === "biannual" ? sub.cost / 6 :
                     sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                     sub.cost,
        actualCost: sub.cost,
        billingCycle: sub.billingCycle,
        currency: sub.currency,
        usageFrequency: sub.usageFrequency || 'unknown',
        lastUsedDate: sub.lastUsedDate
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    // Calculate potential savings from cancelled subscriptions
    const potentialSavings = cancelledSubscriptions.reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      return total + monthlyCost;
    }, 0);

    // Generate spending trend data (last 12 months)
    const now = new Date();
    const spendingTrend = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      // Calculate spending for this month
      const monthlySpending = activeSubscriptions
        .filter(sub => {
          const startDate = new Date(sub.startDate);
          return startDate <= date;
        })
        .reduce((total, sub) => {
          const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                             sub.billingCycle === "quarterly" ? sub.cost / 3 :
                             sub.billingCycle === "biannual" ? sub.cost / 6 :
                             sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                             sub.cost;
          return total + monthlyCost;
        }, 0);
      
      spendingTrend.push({
        month: monthName,
        year,
        amount: monthlySpending,
        subscriptions: activeSubscriptions.filter(sub => {
          const startDate = new Date(sub.startDate);
          return startDate <= date;
        }).length
      });
    }

    return {
      totalSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      categoryBreakdown,
      usageAnalysis,
      billingCycleAnalysis,
      mostExpensive,
      underutilized,
      potentialSavings,
      spendingTrend,
      averagePerSubscription: activeSubscriptions.length > 0 ? monthlyTotal / activeSubscriptions.length : 0,
    };
  },
});

// Get spending insights and recommendations
export const getSpendingInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const insights = [];

    // Calculate monthly total
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      return total + monthlyCost;
    }, 0);

    // High spending alert
    if (monthlyTotal > 5000) { // $50+ per month
      insights.push({
        type: "warning",
        title: "High Monthly Spending",
        message: `You're spending ${(monthlyTotal / 100).toFixed(2)} per month on subscriptions.`,
        icon: "trending-up",
        color: "#FF6B6B"
      });
    }

    // Underutilized subscriptions
    const underutilized = activeSubscriptions.filter(sub => 
      sub.usageFrequency === 'rarely' || sub.usageFrequency === 'never'
    );

    if (underutilized.length > 0) {
      const potentialSavings = underutilized.reduce((total, sub) => {
        const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                           sub.billingCycle === "quarterly" ? sub.cost / 3 :
                           sub.billingCycle === "biannual" ? sub.cost / 6 :
                           sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                           sub.cost;
        return total + monthlyCost;
      }, 0);

      insights.push({
        type: "info",
        title: "Potential Savings",
        message: `You could save $${(potentialSavings / 100).toFixed(2)}/month by cancelling ${underutilized.length} underutilized subscription${underutilized.length > 1 ? 's' : ''}.`,
        icon: "lightbulb",
        color: "#4ECDC4"
      });
    }

    // Annual billing suggestion
    const monthlyBilledSubs = activeSubscriptions.filter(sub => sub.billingCycle === 'monthly');
    if (monthlyBilledSubs.length > 2) {
      insights.push({
        type: "tip",
        title: "Switch to Annual Billing",
        message: `Consider switching ${monthlyBilledSubs.length} monthly subscriptions to annual billing to save money.`,
        icon: "calendar",
        color: "#45B7D1"
      });
    }

    // Category concentration
    const categoryBreakdown = activeSubscriptions.reduce((acc, sub) => {
      acc[sub.category] = (acc[sub.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantCategory = Object.entries(categoryBreakdown).reduce((max, [category, count]) => 
      count > max.count ? { category, count } : max, { category: '', count: 0 }
    );

    if (dominantCategory.count > activeSubscriptions.length * 0.4) {
      insights.push({
        type: "info",
        title: "Category Concentration",
        message: `${Math.round(dominantCategory.count / activeSubscriptions.length * 100)}% of your subscriptions are in ${dominantCategory.category}. Consider diversifying or consolidating.`,
        icon: "pie-chart",
        color: "#96CEB4"
      });
    }

    return insights;
  },
});

// NOTIFICATION FUNCTIONS

// Get all notifications for a user
export const getNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    let notificationsQuery = ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc");

    if (args.unreadOnly) {
      notificationsQuery = notificationsQuery.filter((q) => 
        q.eq(q.field("isRead"), false)
      );
    }

    const notifications = await notificationsQuery.collect();
    
    if (args.limit) {
      return notifications.slice(0, args.limit);
    }
    
    return notifications;
  },
});

// Get notification count
export const getNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    // Count upcoming renewals efficiently
    const upcomingRenewals = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    const unreadCount = upcomingRenewals.filter(sub => {
      const renewalDate = new Date(sub.renewalDate);
      return renewalDate >= today && renewalDate <= weekFromNow;
    }).length;

    return {
      unread: unreadCount,
      total: upcomingRenewals.length,
    };
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return args.notificationId;
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }

    return unreadNotifications.length;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(args.notificationId);
    return args.notificationId;
  },
});

// Create a notification
export const createNotification = mutation({
  args: {
    subscriptionId: v.optional(v.id("subscriptions")),
    type: v.union(
      v.literal("renewal_reminder"),
      v.literal("budget_alert"),
      v.literal("unused_subscription"),
      v.literal("price_increase"),
      v.literal("trial_ending")
    ),
    title: v.string(),
    message: v.string(),
    scheduledFor: v.optional(v.number()),
    metadata: v.optional(v.object({
      subscriptionName: v.optional(v.string()),
      renewalDate: v.optional(v.string()),
      amount: v.optional(v.number()),
      currency: v.optional(v.string()),
      daysUntilRenewal: v.optional(v.number()),
      category: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const notificationId = await ctx.db.insert("notifications", {
      userId,
      subscriptionId: args.subscriptionId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
      scheduledFor: args.scheduledFor,
      metadata: args.metadata,
    });

    return notificationId;
  },
});

// Generate renewal reminder notifications
export const generateRenewalReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const userPreferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!userPreferences || !userPreferences.notifications.renewalReminders) {
      return [];
    }

    const today = new Date();
    const notifications = [];

    // Get active subscriptions
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const subscription of activeSubscriptions) {
      if (!subscription.reminderEnabled) continue;

      const renewalDate = new Date(subscription.renewalDate);
      const daysDiff = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we should send a reminder
      if (daysDiff === subscription.reminderDaysBefore && daysDiff > 0) {
        // Check if we haven't already sent a reminder recently
        const existingReminder = await ctx.db
          .query("notifications")
          .filter((q) => q.eq(q.field("userId"), userId))
          .filter((q) => q.eq(q.field("subscriptionId"), subscription._id))
          .filter((q) => q.eq(q.field("type"), "renewal_reminder"))
          .order("desc")
          .first();

        const daysSinceLastReminder = existingReminder 
          ? Math.ceil((Date.now() - existingReminder.createdAt) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastReminder > subscription.reminderDaysBefore) {
          const notificationId = await ctx.db.insert("notifications", {
            userId,
            subscriptionId: subscription._id,
            type: "renewal_reminder",
            title: `${subscription.name} renews soon`,
            message: `Your ${subscription.name} subscription will renew in ${daysDiff} day${daysDiff > 1 ? 's' : ''} for ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: subscription.currency,
            }).format(subscription.cost / 100)}.`,
            isRead: false,
            createdAt: Date.now(),
            metadata: {
              subscriptionName: subscription.name,
              renewalDate: subscription.renewalDate,
              amount: subscription.cost,
              currency: subscription.currency,
              daysUntilRenewal: daysDiff,
              category: subscription.category,
            },
          });

          notifications.push(notificationId);
        }
      }
    }

    return notifications;
  },
});

// Generate budget alert notifications
export const generateBudgetAlerts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const userPreferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!userPreferences || !userPreferences.notifications.budgetAlerts || !userPreferences.monthlyBudget) {
      return [];
    }

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Calculate monthly total
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                         sub.billingCycle === "quarterly" ? sub.cost / 3 :
                         sub.billingCycle === "biannual" ? sub.cost / 6 :
                         sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                         sub.cost;
      return total + monthlyCost;
    }, 0);

    const budgetPercentage = (monthlyTotal / userPreferences.monthlyBudget) * 100;

    // Check if we should send a budget alert (80% or 100% thresholds)
    if (budgetPercentage >= 80) {
      // Check if we haven't sent a similar alert recently
      const existingAlert = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => q.eq(q.field("type"), "budget_alert"))
        .order("desc")
        .first();

      const daysSinceLastAlert = existingAlert 
        ? Math.ceil((Date.now() - existingAlert.createdAt) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastAlert > 7) { // Only send alerts once per week
        const isOverBudget = budgetPercentage >= 100;
        
        const notificationId = await ctx.db.insert("notifications", {
          userId,
          type: "budget_alert",
          title: isOverBudget ? "Over Budget!" : "Approaching Budget Limit",
          message: `Your monthly subscription spending is ${budgetPercentage.toFixed(1)}% of your ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: userPreferences.defaultCurrency,
          }).format(userPreferences.monthlyBudget / 100)} budget (${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: userPreferences.defaultCurrency,
          }).format(monthlyTotal / 100)}).`,
          isRead: false,
          createdAt: Date.now(),
          metadata: {
            amount: monthlyTotal,
            currency: userPreferences.defaultCurrency,
          },
        });

        return [notificationId];
      }
    }

    return [];
  },
});

// Generate unused subscription notifications
export const generateUnusedSubscriptionAlerts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const userPreferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!userPreferences || !userPreferences.notifications.unusedSubscriptions) {
      return [];
    }

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const notifications = [];

    for (const subscription of activeSubscriptions) {
      if (subscription.usageFrequency === 'rarely' || subscription.usageFrequency === 'never') {
        // Check if we haven't sent an unused subscription alert recently
        const existingAlert = await ctx.db
          .query("notifications")
          .filter((q) => q.eq(q.field("userId"), userId))
          .filter((q) => q.eq(q.field("subscriptionId"), subscription._id))
          .filter((q) => q.eq(q.field("type"), "unused_subscription"))
          .order("desc")
          .first();

        const daysSinceLastAlert = existingAlert 
          ? Math.ceil((Date.now() - existingAlert.createdAt) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastAlert > 30) { // Only send alerts once per month
          const monthlyCost = subscription.billingCycle === "yearly" ? subscription.cost / 12 :
                             subscription.billingCycle === "quarterly" ? subscription.cost / 3 :
                             subscription.billingCycle === "biannual" ? subscription.cost / 6 :
                             subscription.billingCycle === "weekly" ? subscription.cost * 4.33 :
                             subscription.cost;

          const notificationId = await ctx.db.insert("notifications", {
            userId,
            subscriptionId: subscription._id,
            type: "unused_subscription",
            title: `${subscription.name} appears unused`,
            message: `You marked ${subscription.name} as ${subscription.usageFrequency}. Consider canceling to save ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: subscription.currency,
            }).format(monthlyCost / 100)} per month.`,
            isRead: false,
            createdAt: Date.now(),
            metadata: {
              subscriptionName: subscription.name,
              amount: monthlyCost,
              currency: subscription.currency,
              category: subscription.category,
            },
          });

          notifications.push(notificationId);
        }
      }
    }

    return notifications;
  },
});

// SUBSCRIPTION MUTATIONS

// Create a new subscription
export const createSubscription = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    description: v.optional(v.string()),
    cost: v.number(),
    currency: v.string(),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("weekly"),
      v.literal("quarterly"),
      v.literal("biannual")
    ),
    startDate: v.string(),
    renewalDate: v.string(),
    category: v.union(
      v.literal("entertainment"),
      v.literal("productivity"),
      v.literal("gaming"),
      v.literal("education"),
      v.literal("health"),
      v.literal("finance"),
      v.literal("utilities"),
      v.literal("news"),
      v.literal("social"),
      v.literal("other")
    ),
    iconUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    supportUrl: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    reminderDaysBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const now = Date.now();
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId,
      name: args.name,
      provider: args.provider,
      description: args.description,
      cost: args.cost,
      currency: args.currency,
      billingCycle: args.billingCycle,
      startDate: args.startDate,
      renewalDate: args.renewalDate,
      status: "active",
      category: args.category,
      iconUrl: args.iconUrl,
      websiteUrl: args.websiteUrl,
      supportUrl: args.supportUrl,
      createdAt: now,
      updatedAt: now,
      reminderEnabled: args.reminderEnabled ?? true,
      reminderDaysBefore: args.reminderDaysBefore ?? 3,
      costHistory: [{
        amount: args.cost,
        currency: args.currency,
        date: new Date().toISOString(),
        reason: "Initial subscription"
      }],
    });

    return subscriptionId;
  },
});

// Update an existing subscription
export const updateSubscription = mutation({
  args: {
    id: v.id("subscriptions"),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    description: v.optional(v.string()),
    cost: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingCycle: v.optional(v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("weekly"),
      v.literal("quarterly"),
      v.literal("biannual")
    )),
    renewalDate: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("paused"),
      v.literal("trial")
    )),
    category: v.optional(v.union(
      v.literal("entertainment"),
      v.literal("productivity"),
      v.literal("gaming"),
      v.literal("education"),
      v.literal("health"),
      v.literal("finance"),
      v.literal("utilities"),
      v.literal("news"),
      v.literal("social"),
      v.literal("other")
    )),
    iconUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    supportUrl: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    reminderDaysBefore: v.optional(v.number()),
    usageFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("rarely"),
      v.literal("never")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Add all provided fields to updates
    Object.keys(args).forEach(key => {
      if (key !== "id" && args[key as keyof typeof args] !== undefined) {
        updates[key] = args[key as keyof typeof args];
      }
    });

    // Handle cost history if cost changed
    if (args.cost !== undefined && args.cost !== existing.cost) {
      const costHistory = existing.costHistory || [];
      costHistory.push({
        amount: args.cost,
        currency: args.currency || existing.currency,
        date: new Date().toISOString(),
        reason: "Price update"
      });
      updates.costHistory = costHistory;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete a subscription
export const deleteSubscription = mutation({
  args: {
    id: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Cancel a subscription (soft delete)
export const cancelSubscription = mutation({
  args: {
    id: v.id("subscriptions"),
    cancelDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
      cancelDate: args.cancelDate || new Date().toISOString(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Update usage information
export const updateUsage = mutation({
  args: {
    id: v.id("subscriptions"),
    usageFrequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("rarely"),
      v.literal("never")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.id, {
      usageFrequency: args.usageFrequency,
      lastUsedDate: new Date().toISOString(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// SUBSCRIPTION TEMPLATES

// Get all subscription templates
export const getSubscriptionTemplates = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let templatesQuery = ctx.db
      .query("subscriptionTemplates")
      .filter((q) => q.eq(q.field("isActive"), true));

    if (args.category) {
      templatesQuery = templatesQuery.filter((q) => 
        q.eq(q.field("category"), args.category)
      );
    }

    return await templatesQuery.collect();
  },
});

// USER PREFERENCES

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const preferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    // Return default preferences if none exist
    if (!preferences) {
      return {
        userId,
        defaultCurrency: "USD",
        defaultReminderDays: 3,
        notifications: {
          renewalReminders: true,
          budgetAlerts: true,
          unusedSubscriptions: true,
        },
        displaySettings: {
          showCostInCents: false,
          groupByCategory: false,
          defaultView: "list" as const,
        },
      };
    }

    return preferences;
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    defaultCurrency: v.optional(v.string()),
    defaultReminderDays: v.optional(v.number()),
    monthlyBudget: v.optional(v.number()),
    notifications: v.optional(v.object({
      renewalReminders: v.boolean(),
      budgetAlerts: v.boolean(),
      unusedSubscriptions: v.boolean(),
    })),
    displaySettings: v.optional(v.object({
      showCostInCents: v.boolean(),
      groupByCategory: v.boolean(),
      defaultView: v.union(
        v.literal("list"),
        v.literal("grid"),
        v.literal("calendar")
      ),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const existing = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      // Update existing preferences
      const updates: any = {};
      
      if (args.defaultCurrency) updates.defaultCurrency = args.defaultCurrency;
      if (args.defaultReminderDays) updates.defaultReminderDays = args.defaultReminderDays;
      if (args.monthlyBudget !== undefined) updates.monthlyBudget = args.monthlyBudget;
      if (args.notifications) updates.notifications = args.notifications;
      if (args.displaySettings) updates.displaySettings = args.displaySettings;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new preferences
      const newPreferences = {
        userId,
        defaultCurrency: args.defaultCurrency || "USD",
        defaultReminderDays: args.defaultReminderDays || 3,
        monthlyBudget: args.monthlyBudget,
        notifications: args.notifications || {
          renewalReminders: true,
          budgetAlerts: true,
          unusedSubscriptions: true,
        },
        displaySettings: args.displaySettings || {
          showCostInCents: false,
          groupByCategory: false,
          defaultView: "list" as const,
        },
      };

      const preferencesId = await ctx.db.insert("userPreferences", newPreferences);
      return preferencesId;
    }
  },
});

// UTILITY FUNCTIONS

// Get subscription overview/dashboard data
export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    // Use optimized query with index
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    // Calculate totals efficiently
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
      const monthlyCost = getMonthlyCost(sub.cost, sub.billingCycle);
      return total + monthlyCost;
    }, 0);

    // Category breakdown with memoization
    const categoryBreakdown = activeSubscriptions.reduce((acc, sub) => {
      const monthlyCost = getMonthlyCost(sub.cost, sub.billingCycle);
      acc[sub.category] = (acc[sub.category] || 0) + monthlyCost;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSubscriptions: activeSubscriptions.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      categoryBreakdown,
      averagePerSubscription: activeSubscriptions.length > 0 ? 
        monthlyTotal / activeSubscriptions.length : 0,
    };
  },
});

// OVERLAP DETECTION FUNCTIONS

// Define known overlapping services for better detection
const SERVICE_OVERLAPS: Record<string, string[]> = {
  // Streaming services
  'netflix': ['prime_video', 'disney_plus', 'apple_tv_plus', 'hulu', 'hbo_max', 'paramount_plus'],
  'prime_video': ['netflix', 'disney_plus', 'apple_tv_plus', 'hulu', 'hbo_max', 'paramount_plus'],
  'disney_plus': ['netflix', 'prime_video', 'apple_tv_plus', 'hulu', 'hbo_max', 'paramount_plus'],
  'apple_tv_plus': ['netflix', 'prime_video', 'disney_plus', 'hulu', 'hbo_max', 'paramount_plus'],
  'hulu': ['netflix', 'prime_video', 'disney_plus', 'apple_tv_plus', 'hbo_max', 'paramount_plus'],
  'hbo_max': ['netflix', 'prime_video', 'disney_plus', 'apple_tv_plus', 'hulu', 'paramount_plus'],
  'paramount_plus': ['netflix', 'prime_video', 'disney_plus', 'apple_tv_plus', 'hulu', 'hbo_max'],
  
  // Music services
  'spotify': ['apple_music', 'amazon_music', 'youtube_music', 'tidal', 'pandora'],
  'apple_music': ['spotify', 'amazon_music', 'youtube_music', 'tidal', 'pandora'],
  'amazon_music': ['spotify', 'apple_music', 'youtube_music', 'tidal', 'pandora'],
  'youtube_music': ['spotify', 'apple_music', 'amazon_music', 'tidal', 'pandora'],
  'tidal': ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'pandora'],
  'pandora': ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'tidal'],
  
  // Cloud storage
  'google_drive': ['icloud', 'dropbox', 'onedrive', 'box'],
  'icloud': ['google_drive', 'dropbox', 'onedrive', 'box'],
  'dropbox': ['google_drive', 'icloud', 'onedrive', 'box'],
  'onedrive': ['google_drive', 'icloud', 'dropbox', 'box'],
  'box': ['google_drive', 'icloud', 'dropbox', 'onedrive'],
  
  // Productivity suites
  'microsoft_365': ['google_workspace', 'apple_iwork'],
  'google_workspace': ['microsoft_365', 'apple_iwork'],
  'apple_iwork': ['microsoft_365', 'google_workspace'],
  
  // Password managers
  'lastpass': ['1password', 'bitwarden', 'dashlane', 'keeper'],
  '1password': ['lastpass', 'bitwarden', 'dashlane', 'keeper'],
  'bitwarden': ['lastpass', '1password', 'dashlane', 'keeper'],
  'dashlane': ['lastpass', '1password', 'bitwarden', 'keeper'],
  'keeper': ['lastpass', '1password', 'bitwarden', 'dashlane'],
  
  // VPN services
  'nordvpn': ['expressvpn', 'surfshark', 'cyberghost', 'pia', 'protonvpn'],
  'expressvpn': ['nordvpn', 'surfshark', 'cyberghost', 'pia', 'protonvpn'],
  'surfshark': ['nordvpn', 'expressvpn', 'cyberghost', 'pia', 'protonvpn'],
  'cyberghost': ['nordvpn', 'expressvpn', 'surfshark', 'pia', 'protonvpn'],
  'pia': ['nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'protonvpn'],
  'protonvpn': ['nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'pia'],
  
  // Email services
  'gmail': ['outlook', 'yahoo_mail', 'protonmail'],
  'outlook': ['gmail', 'yahoo_mail', 'protonmail'],
  'yahoo_mail': ['gmail', 'outlook', 'protonmail'],
  'protonmail': ['gmail', 'outlook', 'yahoo_mail'],
  
  // Video conferencing
  'zoom': ['teams', 'google_meet', 'webex', 'gotomeeting'],
  'teams': ['zoom', 'google_meet', 'webex', 'gotomeeting'],
  'google_meet': ['zoom', 'teams', 'webex', 'gotomeeting'],
  'webex': ['zoom', 'teams', 'google_meet', 'gotomeeting'],
  'gotomeeting': ['zoom', 'teams', 'google_meet', 'webex'],
};

// Normalize service names for overlap detection
const normalizeServiceName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// Levenshtein distance algorithm
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Get overlap detection results
export const getOverlapDetection = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeSubscriptions.length < 2) {
      return {
        overlapGroups: [],
        potentialSavings: 0,
        totalOverlaps: 0,
        recommendations: []
      };
    }

    const overlapGroups = [];
    const processedIds = new Set();

    // Find overlapping subscriptions
    for (let i = 0; i < activeSubscriptions.length; i++) {
      if (processedIds.has(activeSubscriptions[i]._id)) continue;

      const currentSub = activeSubscriptions[i];
      const currentNormalized = normalizeServiceName(currentSub.name);
      const overlappingServices = [];

      // Check for known service overlaps
      const knownOverlaps = SERVICE_OVERLAPS[currentNormalized] || [];
      
      for (let j = i + 1; j < activeSubscriptions.length; j++) {
        if (processedIds.has(activeSubscriptions[j]._id)) continue;

        const compareSub = activeSubscriptions[j];
        const compareNormalized = normalizeServiceName(compareSub.name);
        
        let overlapScore = 0;
        let overlapReason = '';

        // Check if they're in the same category
        if (currentSub.category === compareSub.category) {
          overlapScore += 0.3;
        }

        // Check for known overlaps
        if (knownOverlaps.includes(compareNormalized)) {
          overlapScore += 0.7;
          overlapReason = 'Known competing service';
        }

        // Check for similar names
        const nameSimilarity = calculateSimilarity(currentNormalized, compareNormalized);
        if (nameSimilarity > 0.7) {
          overlapScore += 0.5;
          overlapReason = overlapReason || 'Similar service names';
        }

        // Check for similar providers
        const providerSimilarity = calculateSimilarity(
          currentSub.provider.toLowerCase(),
          compareSub.provider.toLowerCase()
        );
        if (providerSimilarity > 0.8) {
          overlapScore += 0.4;
          overlapReason = overlapReason || 'Same provider';
        }

        // Consider it an overlap if score is high enough
        if (overlapScore >= 0.6) {
          overlappingServices.push({
            subscription: compareSub,
            overlapScore,
            overlapReason
          });
          processedIds.add(compareSub._id);
        }
      }

      // If we found overlaps, create a group
      if (overlappingServices.length > 0) {
        processedIds.add(currentSub._id);
        
        const allServices = [currentSub, ...overlappingServices.map(o => o.subscription)];
        
        // Calculate monthly costs
        const servicesWithCosts = allServices.map(sub => ({
          ...sub,
          monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 :
                      sub.billingCycle === "quarterly" ? sub.cost / 3 :
                      sub.billingCycle === "biannual" ? sub.cost / 6 :
                      sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                      sub.cost
        }));

        // Sort by usage frequency priority and then by cost
        const usagePriority = { 'daily': 4, 'weekly': 3, 'monthly': 2, 'rarely': 1, 'never': 0 };
        servicesWithCosts.sort((a, b) => {
          const aUsage = usagePriority[a.usageFrequency || 'never'];
          const bUsage = usagePriority[b.usageFrequency || 'never'];
          
          if (aUsage !== bUsage) return bUsage - aUsage;
          return a.monthlyCost - b.monthlyCost; // Keep cheaper if same usage
        });

        const recommended = servicesWithCosts[0];
        const toCancel = servicesWithCosts.slice(1);
        
        const potentialSavings = toCancel.reduce((sum, sub) => sum + sub.monthlyCost, 0);
        
        overlapGroups.push({
          category: currentSub.category,
          services: servicesWithCosts,
          recommended,
          toCancel,
          potentialSavings,
          overlapReason: overlappingServices[0]?.overlapReason || 'Similar functionality'
        });
      }
    }

    // Calculate total potential savings
    const totalPotentialSavings = overlapGroups.reduce((sum, group) => sum + group.potentialSavings, 0);

    // Generate recommendations
    const recommendations = overlapGroups.map(group => ({
      type: "consolidation",
      title: `Consolidate ${group.category} Services`,
      message: `Keep ${group.recommended.name} and cancel ${group.toCancel.length} other${group.toCancel.length > 1 ? 's' : ''} to save $${(group.potentialSavings / 100).toFixed(2)}/month`,
      icon: "merge",
      color: "#4ECDC4",
      actionable: true,
      group
    }));

    return {
      overlapGroups,
      potentialSavings: totalPotentialSavings,
      totalOverlaps: overlapGroups.length,
      recommendations
    };
  },
});

// Get consolidation suggestions with detailed analysis
export const getConsolidationSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    // Get overlap detection data by calling the function directly
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeSubscriptions.length < 2) {
      return {
        suggestions: [],
        totalPotentialSavings: 0,
        overlapCount: 0
      };
    }

    const overlapGroups = [];
    const processedIds = new Set();

    // Find overlapping subscriptions (simplified version for suggestions)
    for (let i = 0; i < activeSubscriptions.length; i++) {
      if (processedIds.has(activeSubscriptions[i]._id)) continue;

      const currentSub = activeSubscriptions[i];
      const currentNormalized = normalizeServiceName(currentSub.name);
      const overlappingServices = [];

      // Check for known service overlaps
      const knownOverlaps = SERVICE_OVERLAPS[currentNormalized] || [];
      
      for (let j = i + 1; j < activeSubscriptions.length; j++) {
        if (processedIds.has(activeSubscriptions[j]._id)) continue;

        const compareSub = activeSubscriptions[j];
        const compareNormalized = normalizeServiceName(compareSub.name);
        
        let overlapScore = 0;
        let overlapReason = '';

        // Check if they're in the same category
        if (currentSub.category === compareSub.category) {
          overlapScore += 0.3;
        }

        // Check for known overlaps
        if (knownOverlaps.includes(compareNormalized)) {
          overlapScore += 0.7;
          overlapReason = 'Known competing service';
        }

        // Check for similar names
        const nameSimilarity = calculateSimilarity(currentNormalized, compareNormalized);
        if (nameSimilarity > 0.7) {
          overlapScore += 0.5;
          overlapReason = overlapReason || 'Similar service names';
        }

        // Check for similar providers
        const providerSimilarity = calculateSimilarity(
          currentSub.provider.toLowerCase(),
          compareSub.provider.toLowerCase()
        );
        if (providerSimilarity > 0.8) {
          overlapScore += 0.4;
          overlapReason = overlapReason || 'Same provider';
        }

        // Consider it an overlap if score is high enough
        if (overlapScore >= 0.6) {
          overlappingServices.push({
            subscription: compareSub,
            overlapScore,
            overlapReason
          });
          processedIds.add(compareSub._id);
        }
      }

      // If we found overlaps, create a group
      if (overlappingServices.length > 0) {
        processedIds.add(currentSub._id);
        
        const allServices = [currentSub, ...overlappingServices.map(o => o.subscription)];
        
        // Calculate monthly costs
        const servicesWithCosts = allServices.map(sub => ({
          ...sub,
          monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 :
                      sub.billingCycle === "quarterly" ? sub.cost / 3 :
                      sub.billingCycle === "biannual" ? sub.cost / 6 :
                      sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                      sub.cost
        }));

        // Sort by usage frequency priority and then by cost
        const usagePriority = { 'daily': 4, 'weekly': 3, 'monthly': 2, 'rarely': 1, 'never': 0 };
        servicesWithCosts.sort((a, b) => {
          const aUsage = usagePriority[a.usageFrequency || 'never'];
          const bUsage = usagePriority[b.usageFrequency || 'never'];
          
          if (aUsage !== bUsage) return bUsage - aUsage;
          return a.monthlyCost - b.monthlyCost; // Keep cheaper if same usage
        });

        const recommended = servicesWithCosts[0];
        const toCancel = servicesWithCosts.slice(1);
        
        const potentialSavings = toCancel.reduce((sum, sub) => sum + sub.monthlyCost, 0);
        
        overlapGroups.push({
          category: currentSub.category,
          services: servicesWithCosts,
          recommended,
          toCancel,
          potentialSavings,
          overlapReason: overlappingServices[0]?.overlapReason || 'Similar functionality'
        });
      }
    }

    // Calculate total potential savings from overlaps
    const totalOverlapSavings = overlapGroups.reduce((sum, group) => sum + group.potentialSavings, 0);

    const suggestions: any[] = [];

    // Add overlap-based suggestions
    overlapGroups.forEach(group => {
      suggestions.push({
        type: "consolidation",
        title: `Consolidate ${group.category} Services`,
        message: `Keep ${group.recommended.name} and cancel ${group.toCancel.length} other${group.toCancel.length > 1 ? 's' : ''} to save $${(group.potentialSavings / 100).toFixed(2)}/month`,
        icon: "merge",
        color: "#4ECDC4",
        actionable: true,
        group
      });
    });

    // Add usage-based suggestions

    // Find underutilized expensive services
    const underutilizedExpensive = activeSubscriptions
      .filter(sub => (sub.usageFrequency === 'rarely' || sub.usageFrequency === 'never'))
      .map(sub => ({
        ...sub,
        monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 :
                    sub.billingCycle === "quarterly" ? sub.cost / 3 :
                    sub.billingCycle === "biannual" ? sub.cost / 6 :
                    sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                    sub.cost
      }))
      .filter(sub => sub.monthlyCost > 1000) // Over $10/month
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    underutilizedExpensive.forEach(sub => {
      suggestions.push({
        type: "unused",
        title: `Consider Cancelling ${sub.name}`,
        message: `You rarely use this service but pay $${(sub.monthlyCost / 100).toFixed(2)}/month`,
        icon: "cancel",
        color: "#FF6B6B",
        actionable: true,
        subscription: sub
      });
    });

    // Annual billing suggestions for frequently used services
    const monthlyHighUsage = activeSubscriptions
      .filter(sub => 
        sub.billingCycle === 'monthly' && 
        (sub.usageFrequency === 'daily' || sub.usageFrequency === 'weekly')
      )
      .map(sub => ({
        ...sub,
        monthlyCost: sub.cost,
        potentialAnnualSavings: sub.cost * 0.15 // Assume 15% savings for annual
      }))
      .sort((a, b) => b.potentialAnnualSavings - a.potentialAnnualSavings);

    monthlyHighUsage.forEach(sub => {
      suggestions.push({
        type: "annual",
        title: `Switch ${sub.name} to Annual`,
        message: `Save ~$${(sub.potentialAnnualSavings / 100).toFixed(2)}/month by switching to annual billing`,
        icon: "calendar",
        color: "#4ECDC4",
        actionable: true,
        subscription: sub
      });
    });

    return {
      suggestions,
      totalPotentialSavings: totalOverlapSavings,
      overlapCount: overlapGroups.length
    };
  },
});

// USAGE TRACKING FUNCTIONS

// Initialize usage stats for a subscription
export const initializeUsageStats = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const initialStats = {
      totalSessions: 0,
      totalHours: 0,
      averageSessionDuration: 0,
      usageStreak: 0,
      longestStreak: 0,
      integrationEnabled: false,
      autoTrackingEnabled: false,
    };

    await ctx.db.patch(args.subscriptionId, {
      usageStats: initialStats,
      updatedAt: Date.now(),
    });

    return initialStats;
  },
});

// Start a usage session
export const startUsageSession = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    sessionType: v.union(v.literal("manual"), v.literal("auto"), v.literal("imported")),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const sessionId = await ctx.db.insert("usageSessions", {
      userId,
      subscriptionId: args.subscriptionId,
      startTime: Date.now(),
      sessionType: args.sessionType,
      deviceType: args.deviceType,
      location: args.location,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

// End a usage session
export const endUsageSession = mutation({
  args: {
    sessionId: v.id("usageSessions"),
    activities: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    satisfaction: v.optional(v.number()),
    productivity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - session.startTime) / (1000 * 60)); // Duration in minutes

    await ctx.db.patch(args.sessionId, {
      endTime,
      duration,
      activities: args.activities,
      notes: args.notes,
      satisfaction: args.satisfaction,
      productivity: args.productivity,
      updatedAt: Date.now(),
    });

    // Update subscription usage stats
    const subscription = await ctx.db.get(session.subscriptionId);
    if (subscription && subscription.usageStats) {
      const stats = subscription.usageStats;
      const newTotalSessions = stats.totalSessions + 1;
      const newTotalHours = stats.totalHours + duration;
      const newAverageSessionDuration = newTotalHours / newTotalSessions;

      await ctx.db.patch(session.subscriptionId, {
        usageStats: {
          ...stats,
          totalSessions: newTotalSessions,
          totalHours: newTotalHours,
          averageSessionDuration: newAverageSessionDuration,
          lastSessionDuration: duration,
        },
        lastUsedDate: new Date().toISOString(),
        updatedAt: Date.now(),
      });
    }

    return { sessionId: args.sessionId, duration };
  },
});

// Delete a usage session
export const deleteUsageSession = mutation({
  args: {
    sessionId: v.id("usageSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Get the session duration before deleting
    const sessionDuration = session.duration || 0;

    // Delete the session
    await ctx.db.delete(args.sessionId);

    // Update subscription usage stats
    const subscription = await ctx.db.get(session.subscriptionId);
    if (subscription && subscription.usageStats) {
      const stats = subscription.usageStats;
      const newTotalSessions = Math.max(0, stats.totalSessions - 1);
      const newTotalHours = Math.max(0, stats.totalHours - sessionDuration);
      const newAverageSessionDuration = newTotalSessions > 0 ? newTotalHours / newTotalSessions : 0;

      await ctx.db.patch(session.subscriptionId, {
        usageStats: {
          ...stats,
          totalSessions: newTotalSessions,
          totalHours: newTotalHours,
          averageSessionDuration: newAverageSessionDuration,
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Log a complete usage session
export const logUsageSession = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    duration: v.number(), // Duration in minutes
    sessionType: v.union(v.literal("manual"), v.literal("auto"), v.literal("imported")),
    activities: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    satisfaction: v.optional(v.number()),
    productivity: v.optional(v.number()),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    sessionDate: v.optional(v.string()), // ISO date string, defaults to now
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const sessionDate = args.sessionDate ? new Date(args.sessionDate) : new Date();
    const startTime = sessionDate.getTime() - (args.duration * 60 * 1000);

    const sessionId = await ctx.db.insert("usageSessions", {
      userId,
      subscriptionId: args.subscriptionId,
      startTime,
      endTime: sessionDate.getTime(),
      duration: args.duration,
      sessionType: args.sessionType,
      activities: args.activities,
      notes: args.notes,
      satisfaction: args.satisfaction,
      productivity: args.productivity,
      deviceType: args.deviceType,
      location: args.location,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update subscription usage stats
    if (subscription.usageStats) {
      const stats = subscription.usageStats;
      const newTotalSessions = stats.totalSessions + 1;
      const newTotalHours = stats.totalHours + args.duration;
      const newAverageSessionDuration = newTotalHours / newTotalSessions;

      await ctx.db.patch(args.subscriptionId, {
        usageStats: {
          ...stats,
          totalSessions: newTotalSessions,
          totalHours: newTotalHours,
          averageSessionDuration: newAverageSessionDuration,
          lastSessionDuration: args.duration,
        },
        lastUsedDate: sessionDate.toISOString(),
        updatedAt: Date.now(),
      });
    } else {
      // Initialize usage stats if they don't exist
      await ctx.db.patch(args.subscriptionId, {
        usageStats: {
          totalSessions: 1,
          totalHours: args.duration,
          averageSessionDuration: args.duration,
          lastSessionDuration: args.duration,
          usageStreak: 0,
          longestStreak: 0,
          integrationEnabled: false,
          autoTrackingEnabled: false,
        },
        lastUsedDate: sessionDate.toISOString(),
        updatedAt: Date.now(),
      });
    }

    return sessionId;
  },
});

// Get usage sessions for a subscription
export const getUsageSessions = query({
  args: {
    subscriptionId: v.id("subscriptions"),
    limit: v.optional(v.number()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) return null;

    let sessionsQuery = ctx.db
      .query("usageSessions")
      .filter((q) => q.eq(q.field("subscriptionId"), args.subscriptionId))
      .order("desc");

    const sessions = await sessionsQuery.collect();

    // Filter by date range if specified
    let filteredSessions = sessions;
    if (args.daysBack) {
      const cutoffDate = Date.now() - (args.daysBack * 24 * 60 * 60 * 1000);
      filteredSessions = sessions.filter(session => session.startTime >= cutoffDate);
    }

    // Apply limit if specified
    if (args.limit) {
      filteredSessions = filteredSessions.slice(0, args.limit);
    }

    return filteredSessions;
  },
});

// Get comprehensive usage analytics for a subscription
export const getUsageAnalytics = query({
  args: {
    subscriptionId: v.id("subscriptions"),
    period: v.optional(v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) return null;

    const period = args.period || "month";
    const daysBack = period === "week" ? 7 : 
                    period === "month" ? 30 : 
                    period === "quarter" ? 90 : 365;

    const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    const sessions = await ctx.db
      .query("usageSessions")
      .filter((q) => q.eq(q.field("subscriptionId"), args.subscriptionId))
      .filter((q) => q.gte(q.field("startTime"), cutoffDate))
      .collect();

    // Calculate analytics
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalHours = totalMinutes / 60;

    // Calculate monthly cost for value metrics
    const monthlyCost = subscription.billingCycle === "yearly" ? subscription.cost / 12 :
                       subscription.billingCycle === "quarterly" ? subscription.cost / 3 :
                       subscription.billingCycle === "biannual" ? subscription.cost / 6 :
                       subscription.billingCycle === "weekly" ? subscription.cost * 4.33 :
                       subscription.cost;

    const costPerHour = totalHours > 0 ? (monthlyCost * (daysBack / 30)) / totalHours : 0;
    const costPerSession = totalSessions > 0 ? (monthlyCost * (daysBack / 30)) / totalSessions : 0;

    // Usage patterns
    const sessionsPerDay = totalSessions / daysBack;
    const hoursPerDay = totalHours / daysBack;
    const averageSessionDuration = totalSessions > 0 ? totalMinutes / totalSessions : 0;

    // Time-based analytics
    const usageByDay = sessions.reduce((acc, session) => {
      const date = new Date(session.startTime).toDateString();
      acc[date] = (acc[date] || 0) + (session.duration || 0);
      return acc;
    }, {} as Record<string, number>);

    const usageByHour = sessions.reduce((acc, session) => {
      const hour = new Date(session.startTime).getHours();
      acc[hour] = (acc[hour] || 0) + (session.duration || 0);
      return acc;
    }, {} as Record<number, number>);

    // Device and location analytics
    const deviceBreakdown = sessions.reduce((acc, session) => {
      const device = session.deviceType || "unknown";
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locationBreakdown = sessions.reduce((acc, session) => {
      const location = session.location || "unknown";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Satisfaction and productivity
    const sessionsWithSatisfaction = sessions.filter(s => s.satisfaction !== undefined);
    const averageSatisfaction = sessionsWithSatisfaction.length > 0 ?
      sessionsWithSatisfaction.reduce((sum, s) => sum + (s.satisfaction || 0), 0) / sessionsWithSatisfaction.length : 0;

    const sessionsWithProductivity = sessions.filter(s => s.productivity !== undefined);
    const averageProductivity = sessionsWithProductivity.length > 0 ?
      sessionsWithProductivity.reduce((sum, s) => sum + (s.productivity || 0), 0) / sessionsWithProductivity.length : 0;

    // Calculate value score (1-100)
    let valueScore = 50; // Base score
    if (costPerHour < 5) valueScore += 20; // Great value per hour
    else if (costPerHour > 20) valueScore -= 20; // Poor value per hour
    if (averageSatisfaction > 4) valueScore += 15; // High satisfaction
    else if (averageSatisfaction < 2) valueScore -= 15; // Low satisfaction
    if (sessionsPerDay >= 1) valueScore += 10; // Regular usage
    else if (sessionsPerDay < 0.1) valueScore -= 20; // Very low usage
    if (averageProductivity > 4) valueScore += 5; // High productivity

    valueScore = Math.max(0, Math.min(100, valueScore));

    return {
      subscription: {
        id: subscription._id,
        name: subscription.name,
        provider: subscription.provider,
        category: subscription.category,
        monthlyCost: monthlyCost / 100, // Convert cents to dollars
      },
      period: {
        type: period,
        daysBack,
        startDate: new Date(cutoffDate).toISOString(),
        endDate: new Date().toISOString(),
      },
      usage: {
        totalSessions,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        totalMinutes,
        sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
        hoursPerDay: Math.round(hoursPerDay * 10) / 10,
        averageSessionDuration: Math.round(averageSessionDuration),
      },
      value: {
        costPerHour: Math.round(costPerHour) / 100, // Convert to dollars
        costPerSession: Math.round(costPerSession) / 100, // Convert to dollars
        valueScore: Math.round(valueScore),
        averageSatisfaction: Math.round(averageSatisfaction * 10) / 10,
        averageProductivity: Math.round(averageProductivity * 10) / 10,
      },
      patterns: {
        usageByDay,
        usageByHour,
        deviceBreakdown,
        locationBreakdown,
      },
      insights: [],
    };
  },
});

// Get usage value insights for all subscriptions
export const getUsageValueInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const insights = [];

    for (const subscription of activeSubscriptions) {
      // Get recent sessions for analysis
      const recentSessions = await ctx.db
        .query("usageSessions")
        .filter((q) => q.eq(q.field("subscriptionId"), subscription._id))
        .filter((q) => q.gte(q.field("startTime"), Date.now() - (30 * 24 * 60 * 60 * 1000)))
        .collect();

      const totalSessions = recentSessions.length;
      const totalMinutes = recentSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const totalHours = totalMinutes / 60;

      // Calculate monthly cost for value metrics
      const monthlyCost = subscription.billingCycle === "yearly" ? subscription.cost / 12 :
                         subscription.billingCycle === "quarterly" ? subscription.cost / 3 :
                         subscription.billingCycle === "biannual" ? subscription.cost / 6 :
                         subscription.billingCycle === "weekly" ? subscription.cost * 4.33 :
                         subscription.cost;

      const costPerHour = totalHours > 0 ? monthlyCost / totalHours : 0;
      const sessionsPerDay = totalSessions / 30;

      // High cost per hour warning
      if (costPerHour > 1000) { // Over $10 per hour
        insights.push({
          subscriptionId: subscription._id,
          subscriptionName: subscription.name,
          type: "high_cost_per_use",
          title: `High Cost Per Hour: ${subscription.name}`,
          message: `You're paying $${(costPerHour / 100).toFixed(2)} per hour of usage. Consider increasing usage or cancelling.`,
          severity: "warning",
          actionable: true,
          actionType: "increase_usage",
          metrics: {
            costPerHour: costPerHour / 100,
          }
        });
      }

      // Low usage warning
      if (sessionsPerDay < 0.1) {
        insights.push({
          subscriptionId: subscription._id,
          subscriptionName: subscription.name,
          type: "low_usage_warning",
          title: `Rarely Used: ${subscription.name}`,
          message: `You've only used this ${totalSessions} time${totalSessions !== 1 ? 's' : ''} this month.`,
          severity: "warning",
          actionable: true,
          actionType: "cancel_subscription",
          metrics: {
            sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
          }
        });
      }

      // Great value celebration
      if (totalHours > 10 && costPerHour < 200) { // More than 10 hours and less than $2/hour
        insights.push({
          subscriptionId: subscription._id,
          subscriptionName: subscription.name,
          type: "great_value",
          title: `Great Value: ${subscription.name}`,
          message: `This subscription provides excellent value at $${(costPerHour / 100).toFixed(2)} per hour.`,
          severity: "positive",
          actionable: false,
          metrics: {
            costPerHour: costPerHour / 100,
          }
        });
      }

      // Usage trending down
      const lastWeekSessions = await ctx.db
        .query("usageSessions")
        .filter((q) => q.eq(q.field("subscriptionId"), subscription._id))
        .filter((q) => q.gte(q.field("startTime"), Date.now() - (7 * 24 * 60 * 60 * 1000)))
        .collect();

      const previousWeekSessions = await ctx.db
        .query("usageSessions")
        .filter((q) => q.eq(q.field("subscriptionId"), subscription._id))
        .filter((q) => q.gte(q.field("startTime"), Date.now() - (14 * 24 * 60 * 60 * 1000)))
        .filter((q) => q.lt(q.field("startTime"), Date.now() - (7 * 24 * 60 * 60 * 1000)))
        .collect();

      if (lastWeekSessions.length < previousWeekSessions.length && previousWeekSessions.length > 2) {
        insights.push({
          subscriptionId: subscription._id,
          subscriptionName: subscription.name,
          type: "usage_trending_down",
          title: `Usage Declining: ${subscription.name}`,
          message: `Your usage has decreased from ${previousWeekSessions.length} to ${lastWeekSessions.length} sessions this week.`,
          severity: "info",
          actionable: true,
          actionType: "set_goal",
          metrics: {
            trendinessScore: (lastWeekSessions.length / (previousWeekSessions.length || 1)) * 100,
          }
        });
      }
    }

    return insights;
  },
});

// Set usage goal for a subscription
export const setUsageGoal = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    goalType: v.union(
      v.literal("weekly_hours"),
      v.literal("monthly_hours"),
      v.literal("weekly_sessions"),
      v.literal("monthly_sessions"),
      v.literal("cost_per_hour"),
      v.literal("value_rating"),
      v.literal("usage_streak")
    ),
    targetValue: v.number(),
    reminderEnabled: v.optional(v.boolean()),
    reminderFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const now = new Date();
    const startDate = now.toISOString();
    
    let endDate: string;
    if (args.goalType.includes("weekly")) {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      endDate = end.toISOString();
    } else if (args.goalType.includes("monthly")) {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString();
    } else {
      // For other goal types, default to monthly
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString();
    }

    const goalId = await ctx.db.insert("usageGoals", {
      userId,
      subscriptionId: args.subscriptionId,
      goalType: args.goalType,
      targetValue: args.targetValue,
      currentValue: 0,
      startDate,
      endDate,
      isActive: true,
      isAchieved: false,
      reminderEnabled: args.reminderEnabled || false,
      reminderFrequency: args.reminderFrequency,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return goalId;
  },
});

// Get usage goals for a subscription
export const getUsageGoals = query({
  args: {
    subscriptionId: v.optional(v.id("subscriptions")),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    let goalsQuery = ctx.db
      .query("usageGoals")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (args.subscriptionId) {
      goalsQuery = goalsQuery.filter((q) => 
        q.eq(q.field("subscriptionId"), args.subscriptionId)
      );
    }

    if (args.activeOnly) {
      goalsQuery = goalsQuery.filter((q) => 
        q.eq(q.field("isActive"), true)
      );
    }

    const goals = await goalsQuery.collect();
    return goals;
  },
});

// SETTINGS FUNCTIONS

// Get settings for the settings screen
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    // Try to get existing preferences
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .unique();

    if (existingPreferences) {
      return {
        renewalReminders: existingPreferences.notifications.renewalReminders,
        budgetAlerts: existingPreferences.notifications.budgetAlerts,
        showCostInCents: existingPreferences.displaySettings.showCostInCents,
        currency: existingPreferences.defaultCurrency,
        reminderDaysBefore: existingPreferences.defaultReminderDays,
      };
    }

    // Return default settings if no preferences exist
    return {
      renewalReminders: true,
      budgetAlerts: true,
      showCostInCents: false,
      currency: "USD",
      reminderDaysBefore: 3,
    };
  },
});

// Update settings
export const updateSettings = mutation({
  args: {
    renewalReminders: v.optional(v.boolean()),
    budgetAlerts: v.optional(v.boolean()),
    showCostInCents: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("userId"), userId))
      .unique();

    if (existingPreferences) {
      // Update existing preferences
      const updates: any = {
        updatedAt: Date.now()
      };
      
      // Build notifications object with all updates
      if (args.renewalReminders !== undefined || args.budgetAlerts !== undefined) {
        updates.notifications = {
          ...existingPreferences.notifications,
          ...(args.renewalReminders !== undefined && { renewalReminders: args.renewalReminders }),
          ...(args.budgetAlerts !== undefined && { budgetAlerts: args.budgetAlerts })
        };
      }
      
      // Build displaySettings object with all updates
      if (args.showCostInCents !== undefined) {
        updates.displaySettings = {
          ...existingPreferences.displaySettings,
          showCostInCents: args.showCostInCents
        };
      }

      await ctx.db.patch(existingPreferences._id, updates);
      return existingPreferences._id;
    } else {
      // Create new preferences with provided settings and defaults
      const newPreferences = {
        userId,
        defaultCurrency: "USD",
        defaultReminderDays: 3,
        notifications: {
          renewalReminders: args.renewalReminders ?? true,
          budgetAlerts: args.budgetAlerts ?? true,
          unusedSubscriptions: true,
        },
        displaySettings: {
          showCostInCents: args.showCostInCents ?? false,
          groupByCategory: true,
          defaultView: "list" as const,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return await ctx.db.insert("userPreferences", newPreferences);
    }
  },
});

// TEMPLATE FUNCTIONS

// Get all available subscription templates
export const getTemplates = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("subscriptionTemplates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by category if provided
    if (args.category) {
      templates = templates.filter(template => 
        template.category.toLowerCase() === args.category!.toLowerCase()
      );
    }

    // Filter by search term if provided
    if (args.search) {
      const searchTerm = args.search.toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.provider.toLowerCase().includes(searchTerm) ||
        template.category.toLowerCase().includes(searchTerm)
      );
    }

    return templates;
  },
});

// Get template by ID
export const getTemplate = query({
  args: {
    templateId: v.id("subscriptionTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Get popular templates (most used)
export const getPopularTemplates = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // For now, return templates sorted by name
    // In a real app, you'd track usage and sort by popularity
    const templates = await ctx.db
      .query("subscriptionTemplates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return templates
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  },
});

// Get templates by category
export const getTemplatesByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptionTemplates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("category"), args.category))
      .collect();
  },
});

// Create subscription from template
export const createFromTemplate = mutation({
  args: {
    templateId: v.id("subscriptionTemplates"),
    planIndex: v.number(), // Index of the plan in commonCosts array
    customName: v.optional(v.string()),
    customProvider: v.optional(v.string()),
    customDescription: v.optional(v.string()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const selectedPlan = template.commonCosts[args.planIndex];
    if (!selectedPlan) throw new Error("Invalid plan selected");

    const now = new Date();
    const startDate = args.startDate || now.toISOString();
    
    // Calculate renewal date based on billing cycle
    const renewalDate = new Date(startDate);
    switch (selectedPlan.billingCycle) {
      case "weekly":
        renewalDate.setDate(renewalDate.getDate() + 7);
        break;
      case "monthly":
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
      case "quarterly":
        renewalDate.setMonth(renewalDate.getMonth() + 3);
        break;
      case "biannual":
        renewalDate.setMonth(renewalDate.getMonth() + 6);
        break;
      case "yearly":
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        break;
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId,
      name: args.customName || template.name,
      provider: args.customProvider || template.provider,
      description: args.customDescription || "",
      cost: selectedPlan.amount,
      currency: selectedPlan.currency,
      billingCycle: selectedPlan.billingCycle as any,
      startDate,
      renewalDate: renewalDate.toISOString(),
      status: "active",
      category: template.category as any,
      iconUrl: template.iconUrl,
      websiteUrl: template.websiteUrl,
      supportUrl: template.supportUrl,
      reminderEnabled: true,
      reminderDaysBefore: 3,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    });

    // Create notification settings for the subscription
    await ctx.db.insert("subscriptionNotifications", {
      userId,
      subscriptionId,
      reminderEnabled: true,
      reminderDaysBefore: 3,
      budgetAlertEnabled: true,
      usageTrackingEnabled: true,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    });

    return subscriptionId;
  },
});

// Populate templates with popular services (run once)
export const populateTemplates = mutation({
  args: {},
  handler: async (ctx, args) => {
    const templates = [
      {
        name: "Netflix",
        provider: "Netflix Inc.",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
        websiteUrl: "https://netflix.com",
        supportUrl: "https://help.netflix.com",
        commonCosts: [
          { amount: 1599, currency: "USD", billingCycle: "monthly", planName: "Standard with Ads" },
          { amount: 1549, currency: "USD", billingCycle: "monthly", planName: "Standard" },
          { amount: 2299, currency: "USD", billingCycle: "monthly", planName: "Premium" },
        ],
        isActive: true,
      },
      {
        name: "Spotify",
        provider: "Spotify AB",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
        websiteUrl: "https://spotify.com",
        supportUrl: "https://support.spotify.com",
        commonCosts: [
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "Premium Individual" },
          { amount: 1299, currency: "USD", billingCycle: "monthly", planName: "Premium Duo" },
          { amount: 1599, currency: "USD", billingCycle: "monthly", planName: "Premium Family" },
        ],
        isActive: true,
      },
      {
        name: "Disney+",
        provider: "Disney",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
        websiteUrl: "https://disneyplus.com",
        supportUrl: "https://help.disneyplus.com",
        commonCosts: [
          { amount: 799, currency: "USD", billingCycle: "monthly", planName: "Basic" },
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "Premium" },
        ],
        isActive: true,
      },
      {
        name: "Hulu",
        provider: "Hulu LLC",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg",
        websiteUrl: "https://hulu.com",
        supportUrl: "https://help.hulu.com",
        commonCosts: [
          { amount: 799, currency: "USD", billingCycle: "monthly", planName: "Basic" },
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "No Ads" },
          { amount: 1799, currency: "USD", billingCycle: "monthly", planName: "Live TV" },
        ],
        isActive: true,
      },
      {
        name: "YouTube Premium",
        provider: "Google",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
        websiteUrl: "https://youtube.com/premium",
        supportUrl: "https://support.google.com/youtube",
        commonCosts: [
          { amount: 1199, currency: "USD", billingCycle: "monthly", planName: "Individual" },
          { amount: 1799, currency: "USD", billingCycle: "monthly", planName: "Family" },
        ],
        isActive: true,
      },
      {
        name: "Adobe Creative Cloud",
        provider: "Adobe Inc.",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Adobe_Systems_logo_and_wordmark.svg",
        websiteUrl: "https://adobe.com/creativecloud",
        supportUrl: "https://helpx.adobe.com",
        commonCosts: [
          { amount: 2099, currency: "USD", billingCycle: "monthly", planName: "Individual" },
          { amount: 5299, currency: "USD", billingCycle: "monthly", planName: "Team" },
        ],
        isActive: true,
      },
      {
        name: "Microsoft 365",
        provider: "Microsoft",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
        websiteUrl: "https://microsoft365.com",
        supportUrl: "https://support.microsoft.com",
        commonCosts: [
          { amount: 699, currency: "USD", billingCycle: "monthly", planName: "Personal" },
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "Family" },
          { amount: 2200, currency: "USD", billingCycle: "monthly", planName: "Business Basic" },
        ],
        isActive: true,
      },
      {
        name: "Notion",
        provider: "Notion Labs",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
        websiteUrl: "https://notion.so",
        supportUrl: "https://developers.notion.com",
        commonCosts: [
          { amount: 0, currency: "USD", billingCycle: "monthly", planName: "Free" },
          { amount: 800, currency: "USD", billingCycle: "monthly", planName: "Personal Pro" },
          { amount: 1000, currency: "USD", billingCycle: "monthly", planName: "Team" },
        ],
        isActive: true,
      },
      {
        name: "Figma",
        provider: "Figma Inc.",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
        websiteUrl: "https://figma.com",
        supportUrl: "https://help.figma.com",
        commonCosts: [
          { amount: 0, currency: "USD", billingCycle: "monthly", planName: "Free" },
          { amount: 1200, currency: "USD", billingCycle: "monthly", planName: "Professional" },
          { amount: 4500, currency: "USD", billingCycle: "monthly", planName: "Organization" },
        ],
        isActive: true,
      },
      {
        name: "Slack",
        provider: "Salesforce",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
        websiteUrl: "https://slack.com",
        supportUrl: "https://slack.com/help",
        commonCosts: [
          { amount: 0, currency: "USD", billingCycle: "monthly", planName: "Free" },
          { amount: 750, currency: "USD", billingCycle: "monthly", planName: "Pro" },
          { amount: 1500, currency: "USD", billingCycle: "monthly", planName: "Business+" },
        ],
        isActive: true,
      },
      {
        name: "Zoom",
        provider: "Zoom Video Communications",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Zoom_logo.svg",
        websiteUrl: "https://zoom.us",
        supportUrl: "https://support.zoom.us",
        commonCosts: [
          { amount: 0, currency: "USD", billingCycle: "monthly", planName: "Free" },
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "Pro" },
          { amount: 1999, currency: "USD", billingCycle: "monthly", planName: "Business" },
        ],
        isActive: true,
      },
      {
        name: "Dropbox",
        provider: "Dropbox Inc.",
        category: "productivity",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Dropbox_Icon.svg",
        websiteUrl: "https://dropbox.com",
        supportUrl: "https://help.dropbox.com",
        commonCosts: [
          { amount: 0, currency: "USD", billingCycle: "monthly", planName: "Free" },
          { amount: 1199, currency: "USD", billingCycle: "monthly", planName: "Plus" },
          { amount: 1999, currency: "USD", billingCycle: "monthly", planName: "Professional" },
        ],
        isActive: true,
      },
      {
        name: "Apple Music",
        provider: "Apple Inc.",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Apple_Music_logo.svg",
        websiteUrl: "https://music.apple.com",
        supportUrl: "https://support.apple.com/music",
        commonCosts: [
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "Individual" },
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "Family" },
        ],
        isActive: true,
      },
      {
        name: "Amazon Prime",
        provider: "Amazon",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/2/27/Amazon_Prime_logo.svg",
        websiteUrl: "https://amazon.com/prime",
        supportUrl: "https://amazon.com/help",
        commonCosts: [
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "Monthly" },
          { amount: 13900, currency: "USD", billingCycle: "yearly", planName: "Annual" },
        ],
        isActive: true,
      },
      {
        name: "HBO Max",
        provider: "Warner Bros. Discovery",
        category: "entertainment",
        iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg",
        websiteUrl: "https://max.com",
        supportUrl: "https://help.max.com",
        commonCosts: [
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "With Ads" },
          { amount: 1599, currency: "USD", billingCycle: "monthly", planName: "Ad-Free" },
        ],
        isActive: true,
      },
    ];

    const templateIds = [];
    for (const template of templates) {
      const templateId = await ctx.db.insert("subscriptionTemplates", template);
      templateIds.push(templateId);
    }

    return templateIds;
  },
});

// EXPORT FUNCTIONS

// Get data for CSV export
export const getExportData = query({
  args: {
    exportType: v.union(
      v.literal("subscriptions"),
      v.literal("analytics"),
      v.literal("usage"),
      v.literal("all")
    ),
    dateRange: v.optional(v.object({
      startDate: v.string(),
      endDate: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const now = new Date();
    const startDate = args.dateRange?.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = args.dateRange?.endDate || now.toISOString();

    const exportData: any = {
      exportDate: now.toISOString(),
      dateRange: { startDate, endDate },
      exportType: args.exportType,
    };

    // Get subscriptions data
    if (args.exportType === "subscriptions" || args.exportType === "all") {
      const subscriptions = await ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      exportData.subscriptions = subscriptions.map(sub => ({
        name: sub.name,
        provider: sub.provider,
        category: sub.category,
        cost: sub.cost / 100, // Convert cents to dollars
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        status: sub.status,
        startDate: sub.startDate,
        renewalDate: sub.renewalDate,
        cancelDate: sub.cancelDate,
        monthlyCost: sub.billingCycle === "yearly" ? sub.cost / 12 / 100 :
                     sub.billingCycle === "quarterly" ? sub.cost / 3 / 100 :
                     sub.billingCycle === "biannual" ? sub.cost / 6 / 100 :
                     sub.billingCycle === "weekly" ? sub.cost * 4.33 / 100 :
                     sub.cost / 100,
        usageFrequency: sub.usageFrequency || "unknown",
        lastUsedDate: sub.lastUsedDate,
      }));
    }

    // Get analytics data
    if (args.exportType === "analytics" || args.exportType === "all") {
      // Calculate analytics directly instead of calling another query
      const subscriptions = await ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter(sub => sub.status === "active").length;
      const monthlyTotal = subscriptions
        .filter(sub => sub.status === "active")
        .reduce((sum, sub) => {
          const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                             sub.billingCycle === "quarterly" ? sub.cost / 3 :
                             sub.billingCycle === "biannual" ? sub.cost / 6 :
                             sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                             sub.cost;
          return sum + monthlyCost;
        }, 0);

      exportData.analytics = {
        totalSubscriptions,
        activeSubscriptions,
        monthlyTotal,
        yearlyTotal: monthlyTotal * 12,
        averagePerSubscription: totalSubscriptions > 0 ? monthlyTotal / totalSubscriptions : 0,
        categoryBreakdown: subscriptions.reduce((acc, sub) => {
          const category = sub.category || "Other";
          const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                             sub.billingCycle === "quarterly" ? sub.cost / 3 :
                             sub.billingCycle === "biannual" ? sub.cost / 6 :
                             sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                             sub.cost;
          acc[category] = (acc[category] || 0) + monthlyCost;
          return acc;
        }, {} as Record<string, number>)
      };
    }

    // Get usage data
    if (args.exportType === "usage" || args.exportType === "all") {
      const usageSessions = await ctx.db
        .query("usageSessions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => q.gte(q.field("startTime"), new Date(startDate).getTime()))
        .filter((q) => q.lte(q.field("startTime"), new Date(endDate).getTime()))
        .collect();

      // Get subscription names for usage data
      const subscriptionIds = [...new Set(usageSessions.map(session => session.subscriptionId))];
      const subscriptions = await Promise.all(
        subscriptionIds.map(id => ctx.db.get(id))
      );
      const subscriptionMap = new Map(subscriptions.map(sub => [sub?._id, sub?.name]));

      exportData.usage = usageSessions.map(session => ({
        subscriptionName: subscriptionMap.get(session.subscriptionId) || "Unknown",
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
        duration: session.duration ? session.duration / 60 : 0, // Convert to hours
        sessionType: session.sessionType,
        activities: session.activities || [],
        notes: session.notes,
        satisfaction: session.satisfaction,
        productivity: session.productivity,
        deviceType: session.deviceType,
        location: session.location,
      }));
    }

    return exportData;
  },
});

// Generate CSV content
export const generateCSV = query({
  args: {
    exportType: v.union(
      v.literal("subscriptions"),
      v.literal("analytics"),
      v.literal("usage"),
      v.literal("all")
    ),
    dateRange: v.optional(v.object({
      startDate: v.string(),
      endDate: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    // Get data directly instead of calling getExportData to avoid circular dependency
    const now = new Date();
    const startDate = args.dateRange?.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = args.dateRange?.endDate || now.toISOString();

    let csvContent = "";
    const timestamp = new Date().toISOString().split('T')[0];

    // Get subscriptions data
    if (args.exportType === "subscriptions" || args.exportType === "all") {
      const subscriptions = await ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      csvContent += `Subscription Data Export - ${timestamp}\n\n`;
      csvContent += "Name,Provider,Category,Cost,Currency,Billing Cycle,Status,Start Date,Renewal Date,Monthly Cost,Usage Frequency,Last Used\n";
      
      subscriptions.forEach((sub) => {
        const cost = sub.cost / 100; // Convert cents to dollars
        const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 / 100 :
                           sub.billingCycle === "quarterly" ? sub.cost / 3 / 100 :
                           sub.billingCycle === "biannual" ? sub.cost / 6 / 100 :
                           sub.billingCycle === "weekly" ? sub.cost * 4.33 / 100 :
                           sub.cost / 100;
        
        csvContent += `"${sub.name}","${sub.provider}","${sub.category}",${cost},"${sub.currency}","${sub.billingCycle}","${sub.status}","${sub.startDate}","${sub.renewalDate}",${monthlyCost},"${sub.usageFrequency || 'unknown'}","${sub.lastUsedDate || ''}"\n`;
      });
      csvContent += "\n";
    }

    // Get analytics data
    if (args.exportType === "analytics" || args.exportType === "all") {
      const subscriptions = await ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter(sub => sub.status === "active").length;
      const monthlyTotal = subscriptions
        .filter(sub => sub.status === "active")
        .reduce((sum, sub) => {
          const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                             sub.billingCycle === "quarterly" ? sub.cost / 3 :
                             sub.billingCycle === "biannual" ? sub.cost / 6 :
                             sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                             sub.cost;
          return sum + monthlyCost;
        }, 0);

      csvContent += `Analytics Data Export - ${timestamp}\n\n`;
      csvContent += "Metric,Value\n";
      csvContent += `Total Subscriptions,${totalSubscriptions}\n`;
      csvContent += `Active Subscriptions,${activeSubscriptions}\n`;
      csvContent += `Monthly Total,${monthlyTotal / 100}\n`;
      csvContent += `Yearly Total,${(monthlyTotal * 12) / 100}\n`;
      csvContent += `Average Per Subscription,${totalSubscriptions > 0 ? (monthlyTotal / totalSubscriptions) / 100 : 0}\n`;
      
      // Category breakdown
      csvContent += "\nCategory Breakdown\n";
      csvContent += "Category,Amount\n";
      const categoryBreakdown = subscriptions.reduce((acc, sub) => {
        const category = sub.category || "Other";
        const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 :
                           sub.billingCycle === "quarterly" ? sub.cost / 3 :
                           sub.billingCycle === "biannual" ? sub.cost / 6 :
                           sub.billingCycle === "weekly" ? sub.cost * 4.33 :
                           sub.cost;
        acc[category] = (acc[category] || 0) + monthlyCost;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(categoryBreakdown).forEach(([category, amount]) => {
        csvContent += `"${category}",${amount / 100}\n`;
      });
      csvContent += "\n";
    }

    // Get usage data
    if (args.exportType === "usage" || args.exportType === "all") {
      const usageSessions = await ctx.db
        .query("usageSessions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => q.gte(q.field("startTime"), new Date(startDate).getTime()))
        .filter((q) => q.lte(q.field("startTime"), new Date(endDate).getTime()))
        .collect();

      // Get subscription names for usage data
      const subscriptionIds = [...new Set(usageSessions.map(session => session.subscriptionId))];
      const subscriptions = await Promise.all(
        subscriptionIds.map(id => ctx.db.get(id))
      );
      const subscriptionMap = new Map(subscriptions.map(sub => [sub?._id, sub?.name]));

      csvContent += `Usage Data Export - ${timestamp}\n\n`;
      csvContent += "Subscription,Start Time,End Time,Duration (hours),Session Type,Activities,Notes,Satisfaction,Productivity,Device,Location\n";
      
      usageSessions.forEach((session) => {
        const subscriptionName = subscriptionMap.get(session.subscriptionId) || "Unknown";
        const startTime = new Date(session.startTime).toISOString();
        const endTime = session.endTime ? new Date(session.endTime).toISOString() : '';
        const duration = session.duration ? session.duration / 60 : 0; // Convert to hours
        
        csvContent += `"${subscriptionName}","${startTime}","${endTime}",${duration},"${session.sessionType}","${(session.activities || []).join('; ')}","${session.notes || ''}",${session.satisfaction || ''},${session.productivity || ''},"${session.deviceType || ''}","${session.location || ''}"\n`;
      });
    }

    return csvContent;
  },
});

// Helper function to calculate monthly cost
const getMonthlyCost = (cost: number, billingCycle: string): number => {
  switch (billingCycle) {
    case "yearly":
      return cost / 12;
    case "quarterly":
      return cost / 3;
    case "biannual":
      return cost / 6;
    case "weekly":
      return cost * 4.33; // Average weeks per month
    case "monthly":
    default:
      return cost;
  }
};