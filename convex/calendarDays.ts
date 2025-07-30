import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    const userId = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (userId === null) {
      throw new Error("User not found");
    }
    const day = await ctx.db
      .query("calendarDays")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId._id).eq("date", args.date)
      )
      .unique();
    console.log("day:", day);
    let toDoItems = [];
    if (day) {
      // Get items in the order they appear in day.items array
      const itemPromises = day.items.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        return item;
      });
      toDoItems = (await Promise.all(itemPromises)).filter(Boolean);
    } else {
      // Fallback: query all items for the date if no calendar day exists
      toDoItems = await ctx.db
        .query("toDoItems")
        .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
        .filter((q) => q.eq(q.field("assignedDate"), args.date))
        .collect();
    }
    const calendarEvents = toDoItems
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (a.type === "project" && b.type !== "project") return -1;
        if (a.type !== "project" && b.type === "project") return 1;
        return 0;
      });
    console.log("toDoItems:", toDoItems);
    return {
      items: toDoItems,
      day: day,
    };
  },
});
