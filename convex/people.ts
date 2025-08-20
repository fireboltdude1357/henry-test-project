import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    name: v.string(),
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
    const personRsp = await ctx.db.insert("people", {
      name: args.name,
      userId: userId._id,
    });
    await ctx.db.insert("peopleData", {
      personId: personRsp,
      userId: userId._id,
      name: args.name,
      birthday: "",
      movies: [],
      books: [],
      tvShows: [],
      music: [],
      games: [],
      other: [],
      dateIdeas: [],
    });
    return personRsp;
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
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
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", userId._id))
      .collect();
  },
});

export const deletePerson = mutation({
  args: {
    id: v.id("people"),
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
    const person = await ctx.db.get(args.id);
    if (person === null) {
      throw new Error("Person not found");
    }
    if (person.userId !== userId._id) {
      throw new Error("Person does not belong to user");
    }
    // Delete any peopleData documents associated with this person
    const peopleDataDocs = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.id))
      .collect();

    for (const doc of peopleDataDocs) {
      await ctx.db.delete(doc._id);
    }

    // Delete the person document
    await ctx.db.delete(args.id);

    return args.id;
  },
});
