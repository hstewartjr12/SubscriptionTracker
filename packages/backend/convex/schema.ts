import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    // User association
    userId: v.string(),
    
    // Basic subscription info
    name: v.string(), // e.g., "Netflix", "Spotify Premium"
    provider: v.string(), // e.g., "Netflix Inc.", "Spotify AB"
    description: v.optional(v.string()), // User notes about the subscription
    
    // Cost information
    cost: v.number(), // Monthly cost in cents to avoid floating point issues
    currency: v.string(), // e.g., "USD", "EUR"
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("weekly"),
      v.literal("quarterly"),
      v.literal("biannual")
    ),
    
    // Dates
    startDate: v.string(), // ISO date string when subscription started
    renewalDate: v.string(), // ISO date string for next renewal
    cancelDate: v.optional(v.string()), // ISO date string when cancelled
    
    // Subscription status
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("paused"),
      v.literal("trial")
    ),
    
    // Category for organization
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
    
    // Usage tracking
    lastUsedDate: v.optional(v.string()), // ISO date string when last used
    usageFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("rarely"),
      v.literal("never")
    )),
    
    // Enhanced usage tracking
    usageStats: v.optional(v.object({
      totalSessions: v.number(), // Total number of usage sessions
      totalHours: v.number(), // Total hours used (in minutes for precision)
      averageSessionDuration: v.number(), // Average session duration in minutes
      lastSessionDuration: v.optional(v.number()), // Last session duration in minutes
      weeklyUsageGoal: v.optional(v.number()), // Target hours per week
      monthlyUsageGoal: v.optional(v.number()), // Target hours per month
      usageStreak: v.number(), // Current consecutive days of usage
      longestStreak: v.number(), // Longest streak of consecutive usage days
      usageRating: v.optional(v.number()), // User's satisfaction rating (1-5)
      valueRating: v.optional(v.number()), // User's value perception rating (1-5)
      integrationEnabled: v.boolean(), // Whether API integration is enabled
      autoTrackingEnabled: v.boolean(), // Whether to auto-track usage
    })),
    
    // Additional metadata
    iconUrl: v.optional(v.string()), // URL to service icon/logo
    websiteUrl: v.optional(v.string()), // Official website
    supportUrl: v.optional(v.string()), // Customer support URL
    
    // Tracking fields
    createdAt: v.number(), // Timestamp when record was created
    updatedAt: v.number(), // Timestamp when record was last updated
    
    // Notifications
    reminderEnabled: v.boolean(), // Whether to send renewal reminders
    reminderDaysBefore: v.number(), // Days before renewal to send reminder
    
    // Cost tracking
    costHistory: v.optional(v.array(v.object({
      amount: v.number(),
      currency: v.string(),
      date: v.string(),
      reason: v.optional(v.string()) // e.g., "price increase", "plan change"
    }))),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_category", ["userId", "category"])
    .index("by_renewal_date", ["renewalDate"])
    .index("by_user_and_renewal", ["userId", "renewalDate"]),
    
  // Table for detailed usage session tracking
  usageSessions: defineTable({
    userId: v.string(),
    subscriptionId: v.id("subscriptions"),
    startTime: v.number(), // Timestamp when session started
    endTime: v.optional(v.number()), // Timestamp when session ended
    duration: v.optional(v.number()), // Session duration in minutes
    sessionType: v.union(
      v.literal("manual"), // Manually logged by user
      v.literal("auto"), // Auto-detected via integration
      v.literal("imported") // Imported from external source
    ),
    activities: v.optional(v.array(v.string())), // What was done during session
    notes: v.optional(v.string()), // User notes about the session
    satisfaction: v.optional(v.number()), // Session satisfaction (1-5)
    productivity: v.optional(v.number()), // How productive was the session (1-5)
    deviceType: v.optional(v.string()), // Device used (mobile, desktop, tv, etc.)
    location: v.optional(v.string()), // Where the session took place
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_user_and_subscription", ["userId", "subscriptionId"])
    .index("by_start_time", ["startTime"])
    .index("by_user_and_time", ["userId", "startTime"]),
    
  // Table for usage goals and tracking
  usageGoals: defineTable({
    userId: v.string(),
    subscriptionId: v.id("subscriptions"),
    goalType: v.union(
      v.literal("weekly_hours"), // Target hours per week
      v.literal("monthly_hours"), // Target hours per month
      v.literal("weekly_sessions"), // Target sessions per week
      v.literal("monthly_sessions"), // Target sessions per month
      v.literal("cost_per_hour"), // Target cost per hour
      v.literal("value_rating"), // Maintain minimum value rating
      v.literal("usage_streak") // Maintain usage streak
    ),
    targetValue: v.number(), // The target value for the goal
    currentValue: v.number(), // Current progress towards goal
    startDate: v.string(), // When goal period started
    endDate: v.string(), // When goal period ends
    isActive: v.boolean(), // Whether goal is currently active
    isAchieved: v.boolean(), // Whether goal has been achieved
    reminderEnabled: v.boolean(), // Whether to send reminders
    reminderFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_user_and_subscription", ["userId", "subscriptionId"])
    .index("by_user_and_active", ["userId", "isActive"])
    .index("by_end_date", ["endDate"]),
    
  // Table for integration settings and API connections
  integrationSettings: defineTable({
    userId: v.string(),
    subscriptionId: v.id("subscriptions"),
    integrationType: v.union(
      v.literal("api"), // Direct API integration
      v.literal("webhook"), // Webhook-based tracking
      v.literal("screen_time"), // Device screen time integration
      v.literal("browser"), // Browser extension tracking
      v.literal("calendar"), // Calendar-based tracking
      v.literal("manual") // Manual tracking only
    ),
    isEnabled: v.boolean(),
    connectionStatus: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
      v.literal("pending")
    ),
    apiEndpoint: v.optional(v.string()), // API endpoint for integration
    apiKey: v.optional(v.string()), // Encrypted API key
    webhookUrl: v.optional(v.string()), // Webhook URL for callbacks
    lastSyncTime: v.optional(v.number()), // Last successful sync timestamp
    errorMessage: v.optional(v.string()), // Last error message
    syncFrequency: v.optional(v.union(
      v.literal("realtime"),
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("weekly")
    )),
    settings: v.optional(v.object({
      trackScreenTime: v.optional(v.boolean()),
      trackActiveTime: v.optional(v.boolean()),
      minimumSessionDuration: v.optional(v.number()), // Min minutes to count as session
      autoEndSession: v.optional(v.boolean()),
      sessionTimeoutMinutes: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_user_and_subscription", ["userId", "subscriptionId"])
    .index("by_user_and_enabled", ["userId", "isEnabled"])
    .index("by_connection_status", ["connectionStatus"]),
    
  // Table for value insights and recommendations
  valueInsights: defineTable({
    userId: v.string(),
    subscriptionId: v.id("subscriptions"),
    insightType: v.union(
      v.literal("high_cost_per_use"),
      v.literal("low_usage_warning"),
      v.literal("great_value"),
      v.literal("usage_trending_up"),
      v.literal("usage_trending_down"),
      v.literal("goal_achieved"),
      v.literal("similar_service_cheaper"),
      v.literal("usage_pattern_change")
    ),
    title: v.string(),
    message: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical"),
      v.literal("positive")
    ),
    actionable: v.boolean(),
    actionType: v.optional(v.union(
      v.literal("increase_usage"),
      v.literal("set_goal"),
      v.literal("cancel_subscription"),
      v.literal("downgrade_plan"),
      v.literal("upgrade_plan"),
      v.literal("enable_reminders")
    )),
    metrics: v.object({
      costPerHour: v.optional(v.number()),
      costPerSession: v.optional(v.number()),
      usageEfficiency: v.optional(v.number()), // Percentage of usage vs plan limits
      valueScore: v.optional(v.number()), // Overall value score (1-100)
      trendinessScore: v.optional(v.number()), // Usage trend score
    }),
    isRead: v.boolean(),
    isDismissed: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // When insight expires
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_user_and_subscription", ["userId", "subscriptionId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_severity", ["severity"])
    .index("by_created", ["createdAt"]),
    
  // Table for subscription categories (for customization)
  subscriptionCategories: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.string(), // Hex color code
    icon: v.optional(v.string()), // Icon name or URL
    isDefault: v.boolean(), // Whether this is a system default category
  })
    .index("by_user", ["userId"]),
    
  // Table for subscription templates (popular services)
  subscriptionTemplates: defineTable({
    name: v.string(),
    provider: v.string(),
    category: v.string(),
    iconUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    supportUrl: v.optional(v.string()),
    commonCosts: v.array(v.object({
      amount: v.number(),
      currency: v.string(),
      billingCycle: v.string(),
      planName: v.string() // e.g., "Basic", "Premium", "Family"
    })),
    isActive: v.boolean(), // Whether template is still available
  })
    .index("by_category", ["category"]),
    
  // Table for user preferences
  userPreferences: defineTable({
    userId: v.string(),
    defaultCurrency: v.string(),
    defaultReminderDays: v.number(),
    monthlyBudget: v.optional(v.number()),
    notifications: v.object({
      renewalReminders: v.boolean(),
      budgetAlerts: v.boolean(),
      unusedSubscriptions: v.boolean(),
    }),
    displaySettings: v.object({
      showCostInCents: v.boolean(),
      groupByCategory: v.boolean(),
      defaultView: v.union(
        v.literal("list"),
        v.literal("grid"),
        v.literal("calendar")
      ),
      dateFormat: v.optional(v.string()),
      timeFormat: v.optional(v.string()),
      theme: v.optional(v.string()),
  }),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]),
    
  // Table for notifications
  notifications: defineTable({
    userId: v.string(),
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
    isRead: v.boolean(),
    createdAt: v.number(),
    scheduledFor: v.optional(v.number()), // Timestamp for scheduled notifications
    metadata: v.optional(v.object({
      subscriptionName: v.optional(v.string()),
      renewalDate: v.optional(v.string()),
      amount: v.optional(v.number()),
      currency: v.optional(v.string()),
      daysUntilRenewal: v.optional(v.number()),
      category: v.optional(v.string()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_type", ["type"])
    .index("by_subscription", ["subscriptionId"]),
    
  // Table for notification settings per subscription
  subscriptionNotifications: defineTable({
    userId: v.string(),
    subscriptionId: v.id("subscriptions"),
    reminderEnabled: v.boolean(),
    reminderDaysBefore: v.number(),
    budgetAlertEnabled: v.boolean(),
    usageTrackingEnabled: v.boolean(),
    lastReminderSent: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_user_and_subscription", ["userId", "subscriptionId"]),
});
