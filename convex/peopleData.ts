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
      args.category === "movies" ||
      args.category === "tvShows" ||
      args.category === "books"
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
import { Id } from "./_generated/dataModel";
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
        Plot?: string;
        Genre?: string;
        Runtime?: string;
      }[];
    const apiKey = process.env.OMDB_API_KEY;
    console.log("apiKey", apiKey);
    if (!apiKey) throw new Error("OMDB_API_KEY not set");
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&type=movie&s=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb search failed");
    const data = await res.json();
    if (data.Response === "False") return [];
    const basics = (data.Search || []) as Array<{
      imdbID: string;
      Title: string;
      Year: string;
      Poster?: string;
    }>;
    const top = basics.slice(0, 5);
    const withDetails = await Promise.all(
      top.map(async (m) => {
        try {
          const dRes = await fetch(
            `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(m.imdbID)}`
          );
          if (!dRes.ok) {
            return {
              imdbID: m.imdbID,
              Title: m.Title,
              Year: m.Year,
              Poster: m.Poster,
            };
          }
          const d = (await dRes.json()) as {
            Plot?: string;
            Genre?: string;
            Runtime?: string;
          };
          return {
            imdbID: m.imdbID,
            Title: m.Title,
            Year: m.Year,
            Poster: m.Poster,
            Plot: d.Plot,
            Genre: d.Genre,
            Runtime: d.Runtime,
          };
        } catch (_err) {
          return {
            imdbID: m.imdbID,
            Title: m.Title,
            Year: m.Year,
            Poster: m.Poster,
          };
        }
      })
    );
    return withDetails;
  },
});

export const searchTvShows = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2)
      return [] as {
        imdbID: string;
        Title: string;
        Year: string;
        Poster?: string;
        Plot?: string;
        Genre?: string;
        Runtime?: string;
      }[];
    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) throw new Error("OMDB_API_KEY not set");
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&type=series&s=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb search failed");
    const data = await res.json();
    if (data.Response === "False") return [];
    const basics = (data.Search || []) as Array<{
      imdbID: string;
      Title: string;
      Year: string;
      Poster?: string;
    }>;
    const top = basics.slice(0, 5);
    const withDetails = await Promise.all(
      top.map(async (m) => {
        try {
          const dRes = await fetch(
            `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(m.imdbID)}`
          );
          if (!dRes.ok) {
            return {
              imdbID: m.imdbID,
              Title: m.Title,
              Year: m.Year,
              Poster: m.Poster,
            };
          }
          const d = (await dRes.json()) as {
            Plot?: string;
            Genre?: string;
            Runtime?: string;
          };
          return {
            imdbID: m.imdbID,
            Title: m.Title,
            Year: m.Year,
            Poster: m.Poster,
            Plot: d.Plot,
            Genre: d.Genre,
            Runtime: d.Runtime,
          };
        } catch (_err) {
          return {
            imdbID: m.imdbID,
            Title: m.Title,
            Year: m.Year,
            Poster: m.Poster,
          };
        }
      })
    );
    return withDetails;
  },
});

export const addTvShowByImdbId = action({
  args: {
    personId: v.id("people"),
    imdbId: v.string(),
    titleFallback: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OMDB_API_KEY;
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

    await ctx.runMutation(api.peopleData.addTvShowWithDetails, payload);
    return { ok: true };
  },
});

export const addTvShowWithDetails = mutation({
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

    const newShow = {
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

    const updated = [
      ...(peopleDataDoc.tvShows as unknown as {
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
      newShow,
    ];
    await ctx.db.patch(peopleDataDoc._id, { tvShows: updated });
    return peopleDataDoc._id;
  },
});

// Books via Open Library
export const searchBooks = action({
  args: { query: v.string() },
  handler: async (_ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2)
      return [] as {
        key: string; // work key
        title: string;
        first_publish_year?: number;
        cover_i?: number;
        subject?: string[];
        description?: string;
      }[];
    const url = `https://openlibrary.org/search.json?limit=5&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open Library search failed");
    const data = await res.json();
    const docs = (data.docs || []) as Array<{
      key: string;
      title: string;
      first_publish_year?: number;
      cover_i?: number;
      subject?: string[];
    }>;
    return docs.slice(0, 5).map((d) => ({
      key: d.key, // e.g. "/works/OL12345W"
      title: d.title,
      first_publish_year: d.first_publish_year,
      cover_i: d.cover_i,
      subject: d.subject,
    }));
  },
});

export const addBookByKey = action({
  args: {
    personId: v.id("people"),
    workKey: v.string(),
    titleFallback: v.string(),
  },
  handler: async (ctx, args) => {
    const workKey = args.workKey; // "/works/OL...W"
    const url = `https://openlibrary.org${workKey}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open Library work fetch failed");
    const w: {
      title?: string;
      description?: string | { value?: string };
      first_publish_date?: string;
      number_of_pages?: number;
      subjects?: string[];
      covers?: number[];
    } = await res.json();

    let description: string | undefined = undefined;
    if (typeof w.description === "string") description = w.description;
    else if (w.description && typeof w.description.value === "string")
      description = w.description.value;

    const coverId =
      Array.isArray(w.covers) && w.covers.length > 0 ? w.covers[0] : undefined;
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : undefined;

    await ctx.runMutation(api.peopleData.addBookWithDetails, {
      personId: args.personId,
      title: w.title || args.titleFallback,
      openLibraryId: workKey,
      year: w.first_publish_date as string | undefined,
      poster: coverUrl,
      runtime: w.number_of_pages as string | undefined,
      genre: Array.isArray(w.subjects)
        ? (w.subjects as string[]).slice(0, 4).join(", ")
        : undefined,
      plot: description,
    });
    return { ok: true };
  },
});

export const addBookWithDetails = mutation({
  args: {
    personId: v.id("people"),
    title: v.string(),
    openLibraryId: v.string(),
    year: v.optional(v.string()),
    poster: v.optional(v.string()),
    runtime: v.optional(v.string()),
    genre: v.optional(v.string()),
    plot: v.optional(v.string()),
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

    const newBook = {
      text: args.title,
      completed: false,
      details: {
        openLibraryId: args.openLibraryId,
        title: args.title,
        year: args.year,
        poster: args.poster,
        runtime: args.runtime,
        genre: args.genre,
        plot: args.plot,
      },
    };

    const updatedBooks = [
      ...(peopleDataDoc.books as unknown as {
        text: string;
        completed: boolean;
        details?: {
          openLibraryId: string;
          title: string;
          year?: string;
          poster?: string;
          runtime?: string;
          genre?: string;
          plot?: string;
        };
      }[]),
      newBook,
    ];
    await ctx.db.patch(peopleDataDoc._id, { books: updatedBooks });
    return peopleDataDoc._id;
  },
});

// Date ideas mutations
export const addDateIdea = mutation({
  args: {
    personId: v.id("people"),
    title: v.string(),
    links: v.array(v.string()),
    notes: v.string(),
    photos: v.array(v.string()),
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

    const updated = [
      ...(peopleDataDoc.dateIdeas as unknown as {
        title: string;
        links: string[];
        notes: string;
        photos: string[];
      }[]),
      {
        title: args.title,
        links: args.links,
        notes: args.notes,
        photos: args.photos,
      },
    ];
    await ctx.db.patch(peopleDataDoc._id, { dateIdeas: updated });
    return peopleDataDoc._id;
  },
});

export const updateDateIdea = mutation({
  args: {
    personId: v.id("people"),
    index: v.number(),
    title: v.optional(v.string()),
    links: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
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

    const ideas = peopleDataDoc.dateIdeas as unknown as {
      title: string;
      links: string[];
      notes: string;
      photos: string[];
    }[];
    if (args.index < 0 || args.index >= ideas.length)
      throw new Error("Index out of bounds");

    const updated = ideas.map((idea, i) =>
      i === args.index
        ? {
            title: args.title ?? idea.title,
            links: args.links ?? idea.links,
            notes: args.notes ?? idea.notes,
            photos: args.photos ?? idea.photos,
          }
        : idea
    );

    await ctx.db.patch(peopleDataDoc._id, { dateIdeas: updated });
    return peopleDataDoc._id;
  },
});

export const removeDateIdea = mutation({
  args: { personId: v.id("people"), index: v.number() },
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
    const ideas = peopleDataDoc.dateIdeas as unknown as {
      title: string;
      links: string[];
      notes: string;
      photos: string[];
    }[];
    if (args.index < 0 || args.index >= ideas.length)
      throw new Error("Index out of bounds");

    // Try to delete any Convex storage files referenced by signed URLs
    const ideaToDelete = ideas[args.index];
    const storageIdsToDelete: string[] = [];
    for (const url of ideaToDelete.photos || []) {
      try {
        const u = new URL(url);
        // Expect path like /api/storage/<id>
        const segments = u.pathname.split("/").filter(Boolean);
        const storageIndex = segments.findIndex((s) => s === "storage");
        const idCandidate =
          storageIndex >= 0
            ? segments[storageIndex + 1]
            : segments[segments.length - 1];
        if (idCandidate && idCandidate.length > 0)
          storageIdsToDelete.push(idCandidate);
      } catch (_e) {
        // Ignore unparsable URLs (external images)
      }
    }
    for (const sid of storageIdsToDelete) {
      try {
        await ctx.storage.delete(sid as unknown as Id<"_storage">);
      } catch (_e) {
        // Ignore failures; proceed to remove the idea
      }
    }

    const updated = ideas.filter((_, i) => i !== args.index);
    await ctx.db.patch(peopleDataDoc._id, { dateIdeas: updated });
    return peopleDataDoc._id;
  },
});

// File uploads for date ideas photos
export const getUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return { uploadUrl: url };
  },
});

export const getSignedUrls = action({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const results: { id: Id<"_storage">; url: string | null }[] = [];
    for (const id of args.ids) {
      const url = await ctx.storage.getUrl(id);
      results.push({ id, url });
    }
    return results;
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
