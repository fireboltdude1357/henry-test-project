import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getByParentId = query({
  args: {
    parentId: v.id("toDoItems"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("toDoItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const createChild = mutation({
  args: {
    parentId: v.id("toDoItems"),
    text: v.string(),
    type: v.optional(
      v.union(v.literal("project"), v.literal("task"), v.literal("folder"))
    ),
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
    const maxOrder = await ctx.db
      .query("toDoItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
    const maxOrderNumber = maxOrder.length;
    return await ctx.db.insert("toDoItems", {
      text: args.text,
      completed: false,
      mainOrder: maxOrderNumber,
      userId: userId._id,
      type: args.type,
      parentId: args.parentId,
    });
  },
});
