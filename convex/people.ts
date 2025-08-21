import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    // Attempt to delete the person's profile photo from Convex storage (if present)
    if (typeof person.photo === "string" && person.photo.length > 0) {
      try {
        const u = new URL(person.photo);
        const segments = u.pathname.split("/").filter(Boolean);
        const storageIndex = segments.findIndex((s) => s === "storage");
        const idCandidate =
          storageIndex >= 0
            ? segments[storageIndex + 1]
            : segments[segments.length - 1];
        if (idCandidate) {
          await ctx.storage.delete(idCandidate as unknown as Id<"_storage">);
        }
      } catch {
        // Ignore if not a Convex storage URL or malformed
      }
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

export const updatePhoto = mutation({
  args: {
    id: v.id("people"),
    photo: v.string(),
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
    if (person === null) throw new Error("Person not found");
    if (person.userId !== userId._id) {
      throw new Error("Person does not belong to user");
    }
    // Delete the old profile photo from Convex storage if it exists and is different
    if (typeof person.photo === "string" && person.photo.length > 0) {
      try {
        const oldUrl = new URL(person.photo);
        const segments = oldUrl.pathname.split("/").filter(Boolean);
        const storageIndex = segments.findIndex((s) => s === "storage");
        const oldId =
          storageIndex >= 0
            ? segments[storageIndex + 1]
            : segments[segments.length - 1];
        // Avoid deleting if the new URL points to the same storage object
        let newId: string | null = null;
        try {
          const nu = new URL(args.photo);
          const segs = nu.pathname.split("/").filter(Boolean);
          const idx = segs.findIndex((s) => s === "storage");
          newId = idx >= 0 ? segs[idx + 1] : segs[segs.length - 1];
        } catch {
          newId = null;
        }
        if (oldId && (!newId || newId !== oldId)) {
          await ctx.storage.delete(oldId as unknown as Id<"_storage">);
        }
      } catch {
        // Ignore if the old photo is not a Convex storage URL
      }
    }

    await ctx.db.patch(args.id, { photo: args.photo });
    return args.id;
  },
});
