import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Default subscription templates for popular services
export const initializeDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const templates = [
      // Entertainment
      {
        name: "Netflix",
        provider: "Netflix Inc.",
        category: "entertainment",
        iconUrl: "https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.png",
        websiteUrl: "https://netflix.com",
        supportUrl: "https://help.netflix.com",
        commonCosts: [
          { amount: 699, currency: "USD", billingCycle: "monthly", planName: "Basic" },
          { amount: 1549, currency: "USD", billingCycle: "monthly", planName: "Standard" },
          { amount: 2299, currency: "USD", billingCycle: "monthly", planName: "Premium" },
        ],
        isActive: true,
      },
      {
        name: "Spotify",
        provider: "Spotify AB",
        category: "entertainment",
        iconUrl: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",
        websiteUrl: "https://spotify.com",
        supportUrl: "https://support.spotify.com",
        commonCosts: [
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "Premium" },
          { amount: 1699, currency: "USD", billingCycle: "monthly", planName: "Family" },
          { amount: 599, currency: "USD", billingCycle: "monthly", planName: "Student" },
        ],
        isActive: true,
      },
      {
        name: "Disney+",
        provider: "The Walt Disney Company",
        category: "entertainment",
        iconUrl: "https://cnbl-cdn.bamgrid.com/assets/7ecc8bcb60ad77193058d63e321bd21cbac2fc67/original",
        websiteUrl: "https://disneyplus.com",
        supportUrl: "https://help.disneyplus.com",
        commonCosts: [
          { amount: 799, currency: "USD", billingCycle: "monthly", planName: "Basic" },
          { amount: 1399, currency: "USD", billingCycle: "monthly", planName: "Premium" },
          { amount: 8999, currency: "USD", billingCycle: "yearly", planName: "Basic Annual" },
        ],
        isActive: true,
      },
      {
        name: "YouTube Premium",
        provider: "Google LLC",
        category: "entertainment",
        iconUrl: "https://www.youtube.com/favicon.ico",
        websiteUrl: "https://youtube.com/premium",
        supportUrl: "https://support.google.com/youtube",
        commonCosts: [
          { amount: 1399, currency: "USD", billingCycle: "monthly", planName: "Individual" },
          { amount: 2299, currency: "USD", billingCycle: "monthly", planName: "Family" },
          { amount: 799, currency: "USD", billingCycle: "monthly", planName: "Student" },
        ],
        isActive: true,
      },
      {
        name: "Amazon Prime",
        provider: "Amazon.com Inc.",
        category: "entertainment",
        iconUrl: "https://www.amazon.com/favicon.ico",
        websiteUrl: "https://amazon.com/prime",
        supportUrl: "https://www.amazon.com/gp/help/customer/display.html",
        commonCosts: [
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "Monthly" },
          { amount: 13900, currency: "USD", billingCycle: "yearly", planName: "Annual" },
          { amount: 799, currency: "USD", billingCycle: "monthly", planName: "Student" },
        ],
        isActive: true,
      },
      // Gaming
      {
        name: "Xbox Game Pass Ultimate",
        provider: "Microsoft Corporation",
        category: "gaming",
        iconUrl: "https://www.xbox.com/favicon.ico",
        websiteUrl: "https://xbox.com/xbox-game-pass",
        supportUrl: "https://support.xbox.com",
        commonCosts: [
          { amount: 1699, currency: "USD", billingCycle: "monthly", planName: "Ultimate" },
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "PC Game Pass" },
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "Console" },
        ],
        isActive: true,
      },
      {
        name: "PlayStation Plus",
        provider: "Sony Interactive Entertainment",
        category: "gaming",
        iconUrl: "https://www.playstation.com/favicon.ico",
        websiteUrl: "https://playstation.com/ps-plus",
        supportUrl: "https://support.playstation.com",
        commonCosts: [
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "Essential" },
          { amount: 1499, currency: "USD", billingCycle: "monthly", planName: "Extra" },
          { amount: 1799, currency: "USD", billingCycle: "monthly", planName: "Premium" },
        ],
        isActive: true,
      },
      // Productivity
      {
        name: "Microsoft 365",
        provider: "Microsoft Corporation",
        category: "productivity",
        iconUrl: "https://www.microsoft.com/favicon.ico",
        websiteUrl: "https://microsoft.com/microsoft-365",
        supportUrl: "https://support.microsoft.com",
        commonCosts: [
          { amount: 699, currency: "USD", billingCycle: "monthly", planName: "Personal" },
          { amount: 1099, currency: "USD", billingCycle: "monthly", planName: "Family" },
          { amount: 1250, currency: "USD", billingCycle: "monthly", planName: "Business Basic" },
        ],
        isActive: true,
      },
      {
        name: "Google Workspace",
        provider: "Google LLC",
        category: "productivity",
        iconUrl: "https://workspace.google.com/favicon.ico",
        websiteUrl: "https://workspace.google.com",
        supportUrl: "https://support.google.com/a",
        commonCosts: [
          { amount: 600, currency: "USD", billingCycle: "monthly", planName: "Business Starter" },
          { amount: 1200, currency: "USD", billingCycle: "monthly", planName: "Business Standard" },
          { amount: 1800, currency: "USD", billingCycle: "monthly", planName: "Business Plus" },
        ],
        isActive: true,
      },
      {
        name: "Notion",
        provider: "Notion Labs Inc.",
        category: "productivity",
        iconUrl: "https://www.notion.so/favicon.ico",
        websiteUrl: "https://notion.so",
        supportUrl: "https://notion.so/help",
        commonCosts: [
          { amount: 800, currency: "USD", billingCycle: "monthly", planName: "Plus" },
          { amount: 1500, currency: "USD", billingCycle: "monthly", planName: "Business" },
          { amount: 2500, currency: "USD", billingCycle: "monthly", planName: "Enterprise" },
        ],
        isActive: true,
      },
      {
        name: "Adobe Creative Cloud",
        provider: "Adobe Inc.",
        category: "productivity",
        iconUrl: "https://www.adobe.com/favicon.ico",
        websiteUrl: "https://adobe.com/creativecloud",
        supportUrl: "https://helpx.adobe.com",
        commonCosts: [
          { amount: 2299, currency: "USD", billingCycle: "monthly", planName: "Individual" },
          { amount: 3399, currency: "USD", billingCycle: "monthly", planName: "Business" },
          { amount: 1999, currency: "USD", billingCycle: "monthly", planName: "Student" },
        ],
        isActive: true,
      },
      // Health & Fitness
      {
        name: "Apple Fitness+",
        provider: "Apple Inc.",
        category: "health",
        iconUrl: "https://www.apple.com/favicon.ico",
        websiteUrl: "https://apple.com/apple-fitness-plus",
        supportUrl: "https://support.apple.com",
        commonCosts: [
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "Monthly" },
          { amount: 7999, currency: "USD", billingCycle: "yearly", planName: "Annual" },
        ],
        isActive: true,
      },
      {
        name: "Peloton App",
        provider: "Peloton Interactive Inc.",
        category: "health",
        iconUrl: "https://www.onepeloton.com/favicon.ico",
        websiteUrl: "https://onepeloton.com",
        supportUrl: "https://support.onepeloton.com",
        commonCosts: [
          { amount: 1299, currency: "USD", billingCycle: "monthly", planName: "App" },
          { amount: 4400, currency: "USD", billingCycle: "monthly", planName: "All-Access" },
        ],
        isActive: true,
      },
      // News & Information
      {
        name: "The New York Times",
        provider: "The New York Times Company",
        category: "news",
        iconUrl: "https://www.nytimes.com/favicon.ico",
        websiteUrl: "https://nytimes.com",
        supportUrl: "https://help.nytimes.com",
        commonCosts: [
          { amount: 499, currency: "USD", billingCycle: "monthly", planName: "Digital" },
          { amount: 899, currency: "USD", billingCycle: "monthly", planName: "All Access" },
        ],
        isActive: true,
      },
      // Cloud Storage
      {
        name: "Dropbox",
        provider: "Dropbox Inc.",
        category: "productivity",
        iconUrl: "https://www.dropbox.com/favicon.ico",
        websiteUrl: "https://dropbox.com",
        supportUrl: "https://help.dropbox.com",
        commonCosts: [
          { amount: 1200, currency: "USD", billingCycle: "monthly", planName: "Plus" },
          { amount: 2000, currency: "USD", billingCycle: "monthly", planName: "Family" },
          { amount: 1800, currency: "USD", billingCycle: "monthly", planName: "Professional" },
        ],
        isActive: true,
      },
      {
        name: "iCloud+",
        provider: "Apple Inc.",
        category: "productivity",
        iconUrl: "https://www.apple.com/favicon.ico",
        websiteUrl: "https://apple.com/icloud",
        supportUrl: "https://support.apple.com",
        commonCosts: [
          { amount: 99, currency: "USD", billingCycle: "monthly", planName: "50GB" },
          { amount: 299, currency: "USD", billingCycle: "monthly", planName: "200GB" },
          { amount: 999, currency: "USD", billingCycle: "monthly", planName: "2TB" },
        ],
        isActive: true,
      },
    ];

    // Insert all templates
    for (const template of templates) {
      await ctx.db.insert("subscriptionTemplates", template);
    }

    return templates.length;
  },
});

// Get popular templates for quick access
export const getPopularTemplates = query({
  args: {},
  handler: async (ctx) => {
    const popularServices = [
      "Netflix", "Spotify", "Disney+", "YouTube Premium", "Amazon Prime",
      "Xbox Game Pass Ultimate", "Microsoft 365", "Adobe Creative Cloud"
    ];

    const templates = await ctx.db
      .query("subscriptionTemplates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return templates.filter(template => 
      popularServices.includes(template.name)
    );
  },
}); 