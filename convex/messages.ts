import { api } from "./_generated/api";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);

    const messagesWithLikes = await Promise.all(
      messages.map(async (message) => {
        // fetch likes for each message
        const likes = await ctx.db
          .query("likes")
          .filter((q) => q.eq(q.field("messageId"), message._id))
          .collect();

        return {
          ...message,
          likes: likes.length,
        };
      })
    );

    // Reverse the list so that it's in a chronological order.
    return messagesWithLikes.reverse().map((message) => {
      return {
        ...message,
        body: message.body.replace(":)", "🥰"),
      };
    });
  },
});

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    // Send a new message.
    await ctx.db.insert("messages", { body, author });

    if (body.startsWith("@gpt") && author !== "ChatGPT") {
      // Schedule the chat action to run immediately
      await ctx.scheduler.runAfter(0, api.openai.chat, {
        messageBody: body,
      });
    }
  },
});

export const like = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    console.log("calling");

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("_id"), messageId))
      .first();
    const liker = messages?.author;
    await ctx.db.insert("likes", { messageId, liker });
  },
});

// export const like = mutation({
//   args: { liker: v.string(), messageId: v.id("messages") },
//   handler: async (ctx, args) => {
//     // Save a user's "like" of a particular message
//     await ctx.db.insert("likes", {
//       liker: args.liker,
//       messageId: args.messageId,
//     });
//   },
// });
