import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// save the snippets to the db
export const createSnippet = mutation({
  args: {
    title: v.string(),
    language: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byUserId")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const snippetId = await ctx.db.insert("snippets", {
      userId: identity.subject,
      userName: user.name,
      title: args.title,
      language: args.language,
      code: args.code,
    });

    return snippetId;
  },
});

export const deleteSnippet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new Error("Snippet not found");

    if (snippet.userId !== identity.subject) {
      throw new Error("Not authorized to delete this snippet");
    }

    // first delete all the comments of the snippet
    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // then delete all stars of the snippet
    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    for (const star of stars) {
      await ctx.db.delete(star._id);
    }

    // finally delete the snippet
    await ctx.db.delete(args.snippetId);
  },
});

// add or remove star from a snippet
export const starSnippet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id")
      .filter(
        (q) =>
          q.eq(q.field("userId"), identity.subject) &&
          q.eq(q.field("snippetId"), args.snippetId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("stars", {
        userId: identity.subject,
        snippetId: args.snippetId,
      });
    }
  },
});

// add a comment to a snippet
export const addComment = mutation({
  args: {
    snippetId: v.id("snippets"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byUserId")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("snippetComments", {
      snippetId: args.snippetId,
      userId: identity.subject,
      userName: user.name,
      content: args.content,
    });
  },
});

// delete a comment from a snippet
export const deleteComment = mutation({
  args: {
    commentId: v.id("snippetComments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // check if the user is the comment author
    if (comment.userId !== identity.subject) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});

// get all the snippets
export const getSnippets = query({
  handler: async (ctx) => {
    const snippets = await ctx.db.query("snippets").order("desc").collect();
    return snippets;
  },
});

// get snippet by id
export const getSnippetById = query({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new Error("Snippet not found");

    return snippet;
  },
});

// get all the comments of a snippet
export const getComments = query({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .order("desc")
      .collect();

    return comments;
  },
});

// check if a snippet has a star
export const isSnippetStarred = query({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const star = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id")
      .filter(
        (q) =>
          q.eq(q.field("userId"), identity.subject) &&
          q.eq(q.field("snippetId"), args.snippetId)
      )
      .first();

    return !!star; // to make it a boolean value
  },
});

// check how many stars a snippet has
export const getSnippetStarCount = query({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id")
      .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
      .collect();

    return stars.length;
  },
});

// get all the snippets a user has starred
export const getStarredSnippets = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const snippets = await Promise.all(
      stars.map((star) => ctx.db.get(star.snippetId))
    );

    return snippets.filter((snippet) => snippet !== null);
  },
});
