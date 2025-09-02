import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

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
    // Strictly honor day.items order (no extra sorting) to avoid snap-back
    toDoItems = toDoItems.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );
    console.log("calendarDays:get -> day.items order:", day?.items);
    console.log(
      "calendarDays:get -> toDoItems in order:",
      toDoItems.map((i) => ({ id: i._id, type: i.type, text: i.text }))
    );
    return {
      items: toDoItems,
      day: day,
    };
  },
});


// export const removeItem = mutation({
//   args: {
//     dayId: v.id("calendarDays"),
//     itemId: v.id("toDoItems"),
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (identity === null) {
//       throw new Error("Not authenticated");
//     }

//     // Get the calendar day document
//     const day = await ctx.db.get(args.dayId);
//     if (!day) {
//       throw new Error("Calendar day not found");
//     }

//     // Remove the itemId from the items array
//     await ctx.db.patch(args.dayId, {
//       items: day.items.filter((tid) => tid !== args.itemId),
//     });
//   },
// });

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