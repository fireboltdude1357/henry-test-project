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
    order: v.number(),
    type: v.optional(
      v.union(v.literal("project"), v.literal("task"), v.literal("folder"))
    ),
    parentId: v.optional(v.id("toDoItems")),
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
    if (args.parentId) {
      const parentItem = await ctx.db.get(args.parentId);
      if (!parentItem) {
        throw new Error("Parent item not found");
      }
    }

    return await ctx.db.insert("toDoItems", {
      text: args.text,
      completed: false,
      mainOrder: args.order,
      userId: userId._id,
      type: args.type,
    });
  },
});

export const updateOrder = mutation({
  args: {
    id: v.id("toDoItems"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { mainOrder: args.order });
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

    // Get the item being deleted to know its order
    const itemToDelete = await ctx.db.get(args.id);
    if (itemToDelete === null) {
      throw new Error("To-do item not found");
    }
    if (itemToDelete.userId !== userId._id) {
      throw new Error("To-do item does not belong to user");
    }

    const deletedOrder = itemToDelete.mainOrder;

    // Delete the item
    await ctx.db.delete(args.id);

    // Get all items with order greater than the deleted item's order
    const itemsToUpdate = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
      .filter((q) => q.gt(q.field("mainOrder"), deletedOrder))
      .collect();

    // Update their orders to close the gap
    for (const item of itemsToUpdate) {
      await ctx.db.patch(item._id, {
        mainOrder: item.mainOrder - 1,
      });
    }

    return { deletedOrder, updatedCount: itemsToUpdate.length };
  },
});
