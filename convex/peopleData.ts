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

    const newItem =
      args.category === "movies"
        ? { text: trimmed, completed: false, details: undefined }
        : { text: trimmed, completed: false };

    const updatedItems = [
      ...categoryItems,
      newItem as { text: string; completed: boolean },
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

// Action: search movies via OMDb (requires OMDB_API_KEY env var)
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const searchMovies = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2)
      return [] as {
        imdbID: string;
        Title: string;
        Year: string;
        Poster?: string;
      }[];
    const apiKey = process.env.OMDB_API_KEY;
    console.log("apiKey", apiKey);
    if (!apiKey) throw new Error("OMDB_API_KEY not set");
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&type=movie&s=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb search failed");
    const data = await res.json();
    if (data.Response === "False") return [];
    return (data.Search || []).map(
      (m: {
        imdbID: string;
        Title: string;
        Year: string;
        Poster?: string;
      }) => ({
        imdbID: m.imdbID,
        Title: m.Title,
        Year: m.Year,
        Poster: m.Poster,
      })
    );
  },
});

export const addMovieByImdbId = action({
  args: {
    personId: v.id("people"),
    imdbId: v.string(),
    titleFallback: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OMDB_API_KEY;
    console.log("apiKey", apiKey);
    if (!apiKey) throw new Error("OMDB_API_KEY not set");
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(args.imdbId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb fetch failed");
    const m: {
      Title?: string;
      Year?: string;
      Poster?: string;
      Runtime?: string;
      Genre?: string;
      Plot?: string;
      imdbID?: string;
      Ratings?: { Source: string; Value: string }[];
    } = await res.json();

    const payload = {
      personId: args.personId,
      title: m?.Title || args.titleFallback,
      imdbId: m?.imdbID || args.imdbId,
      year: m?.Year,
      poster: m?.Poster,
      runtime: m?.Runtime,
      genre: m?.Genre,
      plot: m?.Plot,
      ratings: Array.isArray(m?.Ratings)
        ? m.Ratings.map((r) => ({ source: r.Source, value: r.Value }))
        : undefined,
    };

    await ctx.runMutation(api.peopleData.addMovieWithDetails, payload);
    return { ok: true };
  },
});

export const addMovieWithDetails = mutation({
  args: {
    personId: v.id("people"),
    title: v.string(),
    imdbId: v.string(),
    year: v.optional(v.string()),
    poster: v.optional(v.string()),
    runtime: v.optional(v.string()),
    genre: v.optional(v.string()),
    plot: v.optional(v.string()),
    ratings: v.optional(
      v.array(v.object({ source: v.string(), value: v.string() }))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (user === null) throw new Error("User not found");

    const peopleDataDoc = await ctx.db
      .query("peopleData")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .unique();
    if (peopleDataDoc === null) throw new Error("People data not found");
    if (peopleDataDoc.userId !== user._id)
      throw new Error("People data does not belong to user");

    const newMovie = {
      text: args.title,
      completed: false,
      details: {
        imdbId: args.imdbId,
        title: args.title,
        year: args.year,
        poster: args.poster,
        runtime: args.runtime,
        genre: args.genre,
        plot: args.plot,
        ratings: args.ratings,
      },
    };

    const updatedMovies = [
      ...(peopleDataDoc.movies as unknown as {
        text: string;
        completed: boolean;
        details?: {
          imdbId: string;
          title: string;
          year?: string;
          poster?: string;
          runtime?: string;
          genre?: string;
          plot?: string;
          ratings?: { source: string; value: string }[];
        };
      }[]),
      newMovie,
    ];
    await ctx.db.patch(peopleDataDoc._id, { movies: updatedMovies });
    return peopleDataDoc._id;
  },
});
