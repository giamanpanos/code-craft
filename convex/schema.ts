import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Define tables and fields here
  users: defineTable({
    userId: v.string(), // clerkId
    email: v.string(),
    name: v.string(),
    isPro: v.boolean(), // true if the user has a pro subscription
    proSince: v.optional(v.number()),
    lemonSqueezyCustomerId: v.optional(v.string()),
    lemonSqueezyOrderId: v.optional(v.string()),
  }).index("byUserId", ["userId"]), // to be able to take a user by userId

  codeExecutions: defineTable({
    userId: v.string(),
    language: v.string(),
    code: v.string(),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("byUserId", ["userId"]),

  snippets: defineTable({
    userId: v.string(),
    title: v.string(),
    language: v.string(),
    code: v.string(),
    userName: v.string(), // store user's name for easy access
  }).index("byUserId", ["userId"]),

  snippetComments: defineTable({
    snippetId: v.id("snippets"), // connected to a snippet
    userId: v.string(),
    userName: v.string(),
    content: v.string(), // This will store HTML content
  }).index("by_snippet_id", ["snippetId"]),

  stars: defineTable({
    userId: v.string(), // connected to a user
    snippetId: v.id("snippets"), // connected to a snippet
  })
    .index("by_user_id", ["userId"])
    .index("by_snippet_id", ["snippetId"])
    .index("by_user_id_and_snippet_id", ["userId", "snippetId"]), // to be able to retrieve the stars a user has given in total, a snipper has received in total, and a user has starred a snippet
});
