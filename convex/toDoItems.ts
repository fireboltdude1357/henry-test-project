import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Normalize contiguous mainOrder for uncompleted siblings within the same parent scope
async function normalizeMainOrder(
  ctx: MutationCtx,
  userId: Id<"users">,
  parentId: Id<"toDoItems"> | undefined
) {
  const siblings = await ctx.db
    .query("toDoItems")
    .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("completed"), false),
        q.eq(q.field("parentId"), parentId)
      )
    )
    .collect();

  const ordered = siblings
    .slice()
    .sort((a, b) => (a.mainOrder || 0) - (b.mainOrder || 0));

  for (let i = 0; i < ordered.length; i++) {
    const desired = i + 1;
    if (ordered[i].mainOrder !== desired) {
      await ctx.db.patch(ordered[i]._id, { mainOrder: desired });
    }
  }
}

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
    const inserted = await ctx.db.insert("toDoItems", {
      text: args.text,
      completed: false,
      mainOrder: args.order,
      userId: userId._id,
      type: args.type,
      parentId: args.parentId,
      expanded:
        args.type === "project" || args.type === "folder" ? false : undefined,
    });
    await normalizeMainOrder(ctx, userId._id, args.parentId);
    return inserted;
  },
});

export const updateOrder = mutation({
  args: {
    id: v.id("toDoItems"),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (user === null) {
      throw new Error("User not found");
    }

    const moving = await ctx.db.get(args.id);
    if (!moving) throw new Error("To-do item not found");
    if (moving.userId !== user._id)
      throw new Error("To-do item does not belong to user");

    // Fetch uncompleted siblings within the same parent scope
    const siblings = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_order", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), false),
          q.eq(q.field("parentId"), moving.parentId)
        )
      )
      .collect();

    // Sort by current mainOrder (undefined treated as high)
    const sorted = siblings
      .filter((s) => s._id !== moving._id)
      .sort((a, b) => (a.mainOrder || 1e9) - (b.mainOrder || 1e9));

    // Target position is 1-based; clamp into [1, N+1]
    const N = sorted.length;
    const target = Math.max(1, Math.min(args.order, N + 1));

    // Build new ordered list inserting the moving item BEFORE target
    const before = sorted.slice(0, target - 1);
    const after = sorted.slice(target - 1);
    const newList = [...before, moving, ...after];

    // Persist contiguous 1..N+1 ordering
    for (let i = 0; i < newList.length; i++) {
      const desired = i + 1;
      if (newList[i].mainOrder !== desired) {
        await ctx.db.patch(newList[i]._id, { mainOrder: desired });
      }
    }

    return { newOrder: target };
  },
});

export const updateDayOrder = mutation({
  args: {
    id: v.id("toDoItems"),
    dayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { dayOrder: args.dayOrder });
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

    const newCompletedState = !toDoItem.completed;

    if (newCompletedState) {
      // Completing an item: remove its main order and propagate uncompleted tasks
      const deletedOrder = toDoItem.mainOrder;

      if (deletedOrder !== undefined) {
        // Get all uncompleted items with order greater than the completed item's order
        const itemsToUpdate = await ctx.db
          .query("toDoItems")
          .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
          .filter((q) =>
            q.and(
              q.gt(q.field("mainOrder"), deletedOrder),
              q.eq(q.field("completed"), false),
              q.eq(q.field("parentId"), toDoItem.parentId)
            )
          )
          .collect();

        // Update their orders to close the gap
        for (const item of itemsToUpdate) {
          if (item.mainOrder !== undefined) {
            await ctx.db.patch(item._id, {
              mainOrder: item.mainOrder - 1,
            });
          }
        }
      }

      // Remove the main order from the completed item
      const result = await ctx.db.patch(args.id, {
        completed: newCompletedState,
        mainOrder: undefined,
      });
      await normalizeMainOrder(ctx, userId._id, toDoItem.parentId);
      return result;
    } else {
      // Uncompleting an item: add it to the end of the order

      // Get the highest order among uncompleted items
      const uncompletedItems = await ctx.db
        .query("toDoItems")
        .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("completed"), false),
            q.eq(q.field("parentId"), toDoItem.parentId)
          )
        )
        .collect();

      const maxOrder =
        uncompletedItems.length > 0
          ? Math.max(...uncompletedItems.map((item) => item.mainOrder || 0))
          : 0;

      // Assign the item to the end of the order
      const result = await ctx.db.patch(args.id, {
        completed: newCompletedState,
        mainOrder: maxOrder + 1,
      });
      await normalizeMainOrder(ctx, userId._id, toDoItem.parentId);
      return result;
    }
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

    // If the item is assigned to a day, remove it from that day's list first
    if (itemToDelete.assignedDate) {
      const day = await ctx.db
        .query("calendarDays")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId._id).eq("date", itemToDelete.assignedDate!)
        )
        .unique();
      if (day) {
        await ctx.db.patch(day._id, {
          items: day.items.filter((tid) => tid !== args.id),
        });
      }
    }

    // Delete the item
    await ctx.db.delete(args.id);

    let updatedCount = 0;
    if (deletedOrder !== undefined) {
      const itemsToUpdate = await ctx.db
        .query("toDoItems")
        .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
        .filter((q) =>
          q.and(
            q.gt(q.field("mainOrder"), deletedOrder),
            q.eq(q.field("parentId"), itemToDelete.parentId),
            q.eq(q.field("completed"), false)
          )
        )
        .collect();

      for (const item of itemsToUpdate) {
        if (item.mainOrder !== undefined) {
          await ctx.db.patch(item._id, {
            mainOrder: item.mainOrder - 1,
          });
        }
      }
      updatedCount = itemsToUpdate.length;
    }

    await normalizeMainOrder(ctx, userId._id, itemToDelete.parentId);

    return {
      deletedOrder,
      updatedCount,
    };
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

    let updatedCount = 0;
    if (deletedOrder !== undefined) {
      const itemsToUpdate = await ctx.db
        .query("toDoItems")
        .withIndex("by_user_and_order", (q) => q.eq("userId", userId._id))
        .filter((q) =>
          q.and(
            q.gt(q.field("mainOrder"), deletedOrder),
            q.eq(q.field("parentId"), projectToDelete.parentId),
            q.eq(q.field("completed"), false)
          )
        )
        .collect();

      for (const item of itemsToUpdate) {
        if (item.mainOrder !== undefined) {
          await ctx.db.patch(item._id, {
            mainOrder: item.mainOrder - 1,
          });
        }
      }
      updatedCount = itemsToUpdate.length;
    }

    await normalizeMainOrder(ctx, userId._id, projectToDelete.parentId);

    return { deletedOrder, updatedCount };
  },
});

export const setExpanded = mutation({
  args: {
    id: v.id("toDoItems"),
    expanded: v.boolean(),
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
    return await ctx.db.patch(args.id, { expanded: args.expanded });
  },
});

export const setColor = mutation({
  args: {
    id: v.id("toDoItems"),
    color: v.optional(v.string()),
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
    if (!item) throw new Error("To-do item not found");
    if (item.userId !== userId._id)
      throw new Error("To-do item does not belong to user");
    return await ctx.db.patch(args.id, { color: args.color });
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

export const assignItemToDateAtPosition = mutation({
  args: {
    id: v.id("toDoItems"),
    date: v.string(), // ISO date string (YYYY-MM-DD)
    targetDayOrder: v.number(), // Position to insert at
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

    // Get all items for the target date
    const existingItemsForDate = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_assigned_date", (q) =>
        q.eq("userId", userId._id).eq("assignedDate", args.date)
      )
      .collect();

    // Exclude the item being assigned (in case it's already on this date)
    const otherItemsForDate = existingItemsForDate.filter(
      (item) => item._id !== args.id
    );

    console.log("Inserting item at position:", args.targetDayOrder);
    console.log(
      "Other items before insertion:",
      otherItemsForDate.map((item) => ({
        id: item._id,
        text: item.text,
        dayOrder: item.dayOrder || 0,
      }))
    );

    // Shift all items at or after the target position
    for (const existingItem of otherItemsForDate) {
      if (
        existingItem.dayOrder &&
        existingItem.dayOrder >= args.targetDayOrder
      ) {
        console.log(
          `Shifting item "${existingItem.text}" from dayOrder ${existingItem.dayOrder} to ${existingItem.dayOrder + 1}`
        );
        await ctx.db.patch(existingItem._id, {
          dayOrder: existingItem.dayOrder + 1,
        });
      }
    }

    // Store the previous assigned date for cleanup
    const previousAssignedDate = item.assignedDate;

    // Assign the item to the target position
    const result = await ctx.db.patch(args.id, {
      assignedDate: args.date,
      dayOrder: args.targetDayOrder,
    });

    console.log(
      `Assigned item "${item.text}" to dayOrder ${args.targetDayOrder} on ${args.date}`
    );

    // Clean up gaps in the previous date if item was moved from another date
    if (previousAssignedDate && previousAssignedDate !== args.date) {
      console.log("Cleaning up gaps in previous date:", previousAssignedDate);

      const remainingItemsOnPreviousDate = await ctx.db
        .query("toDoItems")
        .withIndex("by_user_and_assigned_date", (q) =>
          q.eq("userId", userId._id).eq("assignedDate", previousAssignedDate)
        )
        .collect();

      const sortedItems = remainingItemsOnPreviousDate
        .filter((remainingItem) => remainingItem.dayOrder != null)
        .sort((a, b) => (a.dayOrder || 0) - (b.dayOrder || 0));

      for (let i = 0; i < sortedItems.length; i++) {
        const newOrder = i + 1;
        if (sortedItems[i].dayOrder !== newOrder) {
          await ctx.db.patch(sortedItems[i]._id, {
            dayOrder: newOrder,
          });
        }
      }
    }

    return result;
  },
});

export const assignItemToDate = mutation({
  args: {
    id: v.id("toDoItems"),
    // "date" can be either an ISO date string (YYYY-MM-DD) or
    // a concatenation of date + toDoItemId to indicate insertion
    // before a specific item for precise ordering within a day.
    // Example: "2025-01-13k3x9f2..." → date: 2025-01-13, beforeId: k3x9f2...
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
    const existingItemsForDate = await ctx.db
      .query("toDoItems")
      .withIndex("by_user_and_assigned_date", (q) =>
        q.eq("userId", userId._id).eq("assignedDate", args.date)
      )
      .collect();

    // Exclude the item being assigned from the existing items (in case it's already assigned to this date)
    const otherItemsForDate = existingItemsForDate.filter(
      (item) => item._id !== args.id
    );

    // Get all existing dayOrder values and find the next sequential number
    const existingDayOrders = otherItemsForDate
      .map((item) => item.dayOrder || 0)
      .filter((order) => order > 0)
      .sort((a, b) => a - b);

    // Find the first gap in the sequence or use the next number after the last
    let newDayOrder = 1;
    for (let i = 0; i < existingDayOrders.length; i++) {
      if (existingDayOrders[i] === newDayOrder) {
        newDayOrder++;
      } else {
        // Found a gap, use this number
        break;
      }
    }

    console.log(
      "All items for date (including item being assigned):",
      existingItemsForDate.map((item) => ({
        id: item._id,
        text: item.text,
        dayOrder: item.dayOrder,
      }))
    );
    console.log(
      "Other items for date (excluding item being assigned):",
      otherItemsForDate.map((item) => ({
        id: item._id,
        text: item.text,
        dayOrder: item.dayOrder,
      }))
    );
    console.log("Existing dayOrders (sorted):", existingDayOrders);
    console.log("Number of other items:", otherItemsForDate.length);
    console.log("Setting dayOrder to:", newDayOrder);

    const item = await ctx.db.get(args.id);
    if (item === null) {
      throw new Error("To-do item not found");
    }
    if (item.userId !== userId._id) {
      throw new Error("To-do item does not belong to user");
    }
    // Parse date and optional beforeId from the incoming string.
    const dateStr = args.date.substring(0, 10);
    const maybeBeforeId: Id<"toDoItems"> | undefined =
      args.date.length > 10
        ? (args.date.substring(10) as Id<"toDoItems">)
        : undefined;

    // If the item was previously assigned to a different date, remove it from that day
    if (item.assignedDate && item.assignedDate !== dateStr) {
      // Remove item from old calendar day
      const oldCalendarDay = await ctx.db
        .query("calendarDays")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId._id).eq("date", item.assignedDate!)
        )
        .unique();
      if (oldCalendarDay) {
        await ctx.db.patch(oldCalendarDay._id, {
          items: oldCalendarDay.items.filter((id) => id !== args.id),
        });
      }
    }
    // Check if calendar day already exists
    const existingCalendarDay = await ctx.db
      .query("calendarDays")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId._id).eq("date", dateStr)
      )
      .unique();

    if (existingCalendarDay) {
      // Build new ordered items array, removing any prior occurrence first
      let newItems = existingCalendarDay.items.filter((id) => id !== args.id);
      if (maybeBeforeId) {
        const insertBeforeIndex = newItems.findIndex(
          (id) => id === maybeBeforeId
        );
        const boundedIndex =
          insertBeforeIndex >= 0 ? insertBeforeIndex : newItems.length;
        newItems = [
          ...newItems.slice(0, boundedIndex),
          args.id,
          ...newItems.slice(boundedIndex),
        ];
      } else {
        newItems.push(args.id);
      }
      await ctx.db.patch(existingCalendarDay._id, { items: newItems });
    } else {
      // Create new calendar day
      await ctx.db.insert("calendarDays", {
        date: dateStr,
        items: [args.id],
        userId: userId._id,
      });
    }
    return await ctx.db.patch(args.id, { assignedDate: dateStr });
  },
});
