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
    mainOrder: v.optional(v.number()),
    userId: v.id("users"),
    type: v.optional(
      v.union(v.literal("project"), v.literal("task"), v.literal("folder"))
    ),
    dayOrder: v.optional(v.number()),
    parentId: v.optional(v.id("toDoItems")),
    // dueDate: v.optional(v.string()),
    assignedDate: v.optional(v.string()),
    expanded: v.optional(v.boolean()),
    color: v.optional(v.string()),
    timeEstimateHours: v.optional(v.number()),
    timeEstimateMinutes: v.optional(v.number()),
  })
    .index("by_user_and_order", ["userId", "mainOrder"])
    .index("by_user_type_and_order", ["userId", "type", "mainOrder"])
    .index("by_user_day_order", ["userId", "dayOrder"])
    .index("by_parent", ["parentId", "mainOrder"])
    .index("by_user_and_assigned_date", ["userId", "assignedDate"]),
  users: defineTable({
    name: v.optional(v.string()),
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
  people: defineTable({
    name: v.string(),
    userId: v.id("users"),
    photo: v.optional(v.string()),
  }).index("by_user", ["userId"]),
  peopleData: defineTable({
    personId: v.id("people"),
    birthday: v.optional(v.string()),
    anniversary: v.optional(v.string()),
    movies: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
          details: v.optional(
            v.object({
              imdbId: v.string(),
              title: v.string(),
              year: v.optional(v.string()),
              poster: v.optional(v.string()),
              runtime: v.optional(v.string()),
              genre: v.optional(v.string()),
              plot: v.optional(v.string()),
              ratings: v.optional(
                v.array(v.object({ source: v.string(), value: v.string() }))
              ),
            })
          ),
        })
      )
    ),
    books: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
          details: v.optional(
            v.object({
              // Open Library work key or other ID
              openLibraryId: v.string(),
              title: v.string(),
              year: v.optional(v.string()),
              // Keep naming consistent with UI rendering that expects `poster`
              poster: v.optional(v.string()),
              runtime: v.optional(v.string()), // pages
              genre: v.optional(v.string()), // subjects
              plot: v.optional(v.string()), // description
            })
          ),
        })
      )
    ),
    tvShows: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
          details: v.optional(
            v.object({
              imdbId: v.string(),
              title: v.string(),
              year: v.optional(v.string()),
              poster: v.optional(v.string()),
              runtime: v.optional(v.string()),
              genre: v.optional(v.string()),
              plot: v.optional(v.string()),
              ratings: v.optional(
                v.array(v.object({ source: v.string(), value: v.string() }))
              ),
            })
          ),
        })
      )
    ),
    music: v.optional(
      v.array(v.object({ text: v.string(), completed: v.boolean() }))
    ),
    games: v.optional(
      v.array(v.object({ text: v.string(), completed: v.boolean() }))
    ),
    other: v.optional(
      v.array(v.object({ text: v.string(), completed: v.boolean() }))
    ),
    dateIdeas: v.optional(
      v.array(
        v.object({
          title: v.string(),
          links: v.array(v.string()),
          notes: v.string(),
          photos: v.array(v.string()), // photo URLs for now; can migrate to Convex storage IDs later
        })
      )
    ),
    giftIdeas: v.optional(
      v.array(
        v.object({
          title: v.string(),
          links: v.array(v.string()),
          notes: v.string(),
          photos: v.array(v.string()),
        })
      )
    ),
    tripIdeas: v.optional(
      v.array(
        v.object({
          title: v.string(),
          links: v.array(v.string()),
          notes: v.string(),
          photos: v.array(v.string()),
        })
      )
    ),
    customInfo: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.optional(v.string()),
          list: v.optional(v.array(v.string())),
          ordered: v.optional(v.boolean()),
          todos: v.optional(
            v.array(v.object({ text: v.string(), completed: v.boolean() }))
          ),
        })
      )
    ),
    userId: v.id("users"),
    name: v.optional(v.string()),
  }).index("by_person", ["personId"]),
};

export default defineSchema({
  //   ...authTables,
  ...applicationTables,
});
