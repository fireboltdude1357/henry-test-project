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
    type: v.optional(
      v.union(v.literal("project"), v.literal("task"), v.literal("folder"))
    ),
    dayOrder: v.optional(v.number()),
    parentId: v.optional(v.id("toDoItems")),
    // dueDate: v.optional(v.string()),
    assignedDate: v.optional(v.string()),
  })
    .index("by_user_and_order", ["userId", "mainOrder"])
    .index("by_user_type_and_order", ["userId", "type", "mainOrder"])
    .index("by_user_day_order", ["userId", "dayOrder"])
    .index("by_parent", ["parentId", "mainOrder"])
    .index("by_user_and_assigned_date", ["userId", "assignedDate"]),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    externalId: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("byExternalId", ["externalId"]),
  calendarDays: defineTable({
    date: v.string(),
    items: v.array(v.id("toDoItems")),
    userId: v.id("users"),
  }).index("by_user_and_date", ["userId", "date"]),
  calendarEvents: defineTable({
    title: v.string(),
    description: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  }),
};

export default defineSchema({
  //   ...authTables,
  ...applicationTables,
});
