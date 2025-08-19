import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    personId: v.id("people"),
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
    return await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
  },
});

export const toggleItem = mutation({
  args: {
    personId: v.id("people"),
    category: v.union(
      v.literal("movies"),
      v.literal("books"),
      v.literal("tvShows"),
      v.literal("music"),
      v.literal("games"),
      v.literal("other")
    ),
    index: v.number(),
    completed: v.boolean(),
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

    const peopleDataDoc = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
    if (peopleDataDoc === null) {
      throw new Error("People data not found");
    }
    if (peopleDataDoc.userId !== user._id) {
      throw new Error("People data does not belong to user");
    }

    const categoryItems = peopleDataDoc[args.category] as Array<{
      text: string;
      completed: boolean;
    }>;
    if (args.index < 0 || args.index >= categoryItems.length) {
      throw new Error("Index out of bounds");
    }

    const updatedItems = categoryItems.map((item, idx) =>
      idx === args.index ? { ...item, completed: args.completed } : item
    );

    await ctx.db.patch(peopleDataDoc._id, {
      [args.category]: updatedItems,
    });

    return peopleDataDoc._id;
  },
});

export const addItem = mutation({
  args: {
    personId: v.id("people"),
    category: v.union(
      v.literal("movies"),
      v.literal("books"),
      v.literal("tvShows"),
      v.literal("music"),
      v.literal("games"),
      v.literal("other")
    ),
    text: v.string(),
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

    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Text is required");
    }

    const peopleDataDoc = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
    if (peopleDataDoc === null) {
      throw new Error("People data not found");
    }
    if (peopleDataDoc.userId !== user._id) {
      throw new Error("People data does not belong to user");
    }

    const categoryItems = peopleDataDoc[args.category] as Array<{
      text: string;
      completed: boolean;
    }>;

    const updatedItems = [
      ...categoryItems,
      { text: trimmed, completed: false },
    ];

    await ctx.db.patch(peopleDataDoc._id, {
      [args.category]: updatedItems,
    });

    return peopleDataDoc._id;
  },
});

export const clearCategory = mutation({
  args: {
    personId: v.id("people"),
    category: v.union(
      v.literal("movies"),
      v.literal("books"),
      v.literal("tvShows"),
      v.literal("music"),
      v.literal("games"),
      v.literal("other")
    ),
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

    const peopleDataDoc = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
    if (peopleDataDoc === null) {
      throw new Error("People data not found");
    }
    if (peopleDataDoc.userId !== user._id) {
      throw new Error("People data does not belong to user");
    }

    await ctx.db.patch(peopleDataDoc._id, {
      [args.category]: [],
    });

    return peopleDataDoc._id;
  },
});

export const removeItem = mutation({
  args: {
    personId: v.id("people"),
    category: v.union(
      v.literal("movies"),
      v.literal("books"),
      v.literal("tvShows"),
      v.literal("music"),
      v.literal("games"),
      v.literal("other")
    ),
    index: v.number(),
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

    const peopleDataDoc = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
    if (peopleDataDoc === null) {
      throw new Error("People data not found");
    }
    if (peopleDataDoc.userId !== user._id) {
      throw new Error("People data does not belong to user");
    }

    const categoryItems = peopleDataDoc[args.category] as Array<{
      text: string;
      completed: boolean;
    }>;
    if (args.index < 0 || args.index >= categoryItems.length) {
      throw new Error("Index out of bounds");
    }

    const updatedItems = categoryItems.filter((_, idx) => idx !== args.index);

    await ctx.db.patch(peopleDataDoc._id, {
      [args.category]: updatedItems,
    });

    return peopleDataDoc._id;
  },
});
