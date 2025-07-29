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
      parentId: args.parentId,
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

export const deleteProject = mutation({
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

    // Helper function to recursively delete all children
    async function deleteAllChildren(parentId: Id<"toDoItems">): Promise<void> {
      const children = await ctx.db
        .query("toDoItems")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .collect();

      for (const child of children) {
        // If child is a project, recursively delete its children first
        if (child.type === "project" || child.type === "folder") {
          await deleteAllChildren(child._id);
        }
        // Delete the child
        await ctx.db.delete(child._id);
      }
    }

    // Get the project being deleted
    const projectToDelete = await ctx.db.get(args.id);
    if (projectToDelete === null) {
      throw new Error("Project not found");
    }
    if (projectToDelete.userId !== userId._id) {
      throw new Error("Project does not belong to user");
    }

    const deletedOrder = projectToDelete.mainOrder;

    // Recursively delete all children first
    await deleteAllChildren(args.id);

    // Delete the project itself
    await ctx.db.delete(args.id);

    // Get all items with order greater than the deleted project's order
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

export const getItemsByDateRange = query({
  args: {
    startDate: v.string(), // ISO date string (YYYY-MM-DD)
    endDate: v.string(), // ISO date string (YYYY-MM-DD)
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

    const items = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
      .filter((q) =>
        q.and(
          q.neq(q.field("assignedDate"), undefined),
          q.gte(q.field("assignedDate"), args.startDate),
          q.lte(q.field("assignedDate"), args.endDate)
        )
      )
      .collect();

    return items;
  },
});

export const getItemsByDate = query({
  args: {
    date: v.string(), // ISO date string (YYYY-MM-DD)
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

    const items = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
      .filter((q) => q.eq(q.field("assignedDate"), args.date))
      .collect();

    return items;
  },
});

export const assignItemToDate = mutation({
  args: {
    id: v.id("toDoItems"),
    date: v.string(), // ISO date string (YYYY-MM-DD)
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

    const item = await ctx.db.get(args.id);
    if (item === null) {
      throw new Error("To-do item not found");
    }
    if (item.userId !== userId._id) {
      throw new Error("To-do item does not belong to user");
    }

    return await ctx.db.patch(args.id, { assignedDate: args.date });
  },
});
