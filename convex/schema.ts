import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// import { authTables } from "@convex-dev/auth/server";

// const applicationTables = {
//   todos: defineTable({
//     text: v.string(),
//     completed: v.boolean(),
//     order: v.number(),
//     userId: v.id("users"),
//     type: v.optional(v.union(v.literal("project"), v.literal("task"))),
//     parentId: v.optional(v.id("todos")), // For tasks that belong to a project
//     dueDate: v.optional(v.string()), // ISO date string (YYYY-MM-DD)
//   })
//     .index("by_user_and_order", ["userId", "order"])
//     .index("by_parent", ["parentId"])
//     .index("by_user_and_due_date", ["userId", "dueDate"]),
// };

const applicationTables = {
  toDoItems: defineTable({
    text: v.string(),
    completed: v.boolean(),
    mainOrder: v.number(),
    userId: v.id("users"),
  }).index("by_user_and_order", ["userId", "mainOrder"]),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    externalId: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("byExternalId", ["externalId"]),
};

export default defineSchema({
  //   ...authTables,
  ...applicationTables,
});
