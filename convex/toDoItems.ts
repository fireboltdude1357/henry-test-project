import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    // const userId = identity.subject as Id<"users">;
    const userId = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (userId === null) {
      throw new Error("User not found");
    }
    return await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    // const userId = identity.subject as Id<"users">;
    const userId = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (userId === null) {
      throw new Error("User not found");
    }
    return await ctx.db.insert("toDoItems", {
      text: args.text,
      completed: false,
      mainOrder: 0,
      userId: userId._id,
    });
  },
});

export const toggleComplete = mutation({
  args: {
    id: v.id("toDoItems"),
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
    const toDoItem = await ctx.db.get(args.id);
    if (toDoItem === null) {
      throw new Error("To-do item not found");
    }
    if (toDoItem.userId !== userId._id) {
      throw new Error("To-do item does not belong to user");
    }
    return await ctx.db.patch(args.id, { completed: !toDoItem.completed });
  },
});

export const deleteItem = mutation({
  args: {
    id: v.id("toDoItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
