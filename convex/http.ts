import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// we are listening for a clerk event (webhook -> we have added one in our clerk account for user.created) and gave the following path to it
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // We run this action and check if we receive the CLERK_WEBHOOK_SECRET environment variable
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    // If yes we are checking the headers of the request that should have the 3 following headers
    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    // Then we receive the request and we verify it to make sure it is send by clerk
    const payload = await request.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.log("Error verifying webhook:", err);
      return new Response("Error occurred", {
        status: 400,
      });
    }

    // Finally we check the event is user.created and if yes we take the user's info from clerk to save it to convex db
    const eventType = evt.type;
    if (eventType === "user.created") {
      // save the user to convex db
      const { id, email_addresses, first_name, last_name } = evt.data;

      const email = email_addresses[0].email_address;
      const name = `${first_name || ""} ${last_name || ""}`.trim();

      try {
        // save user to db
        await ctx.runMutation(api.users.syncUser, { userId: id, email, name });
      } catch (error) {
        console.log("Error creating user:", error);
        return new Response("Error creating user", {
          status: 500,
        });
      }
    }

    return new Response("Webhook processed successfully", {
      status: 200,
    });
  }),
});

// we are listening for a lemon squeezy event (webhook -> we have added one in our lemon squeezy account)
// this is triggered after a user has placed paid for the Pro Plan
http.route({
  path: "/lemon-squeezy-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const signature = request.headers.get("X-Signature");

    if (!signature) {
      return new Response("Missing X-Signature header", {
        status: 400,
      });
    }

    // We are verifying the webhook to see if it is send by lemon squeezy
    try {
      const payload = await ctx.runAction(internal.lemonSqueezy.verifyWebhook, {
        payload: payloadString,
        signature,
      });

      // if the event is order_created we are upgrading the user to pro
      if (payload.meta.event_name === "order_created") {
        const { data } = payload;

        const { success } = await ctx.runMutation(api.users.upgradeToPro, {
          email: data.attributes.user_email,
          lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
          lemonSqueezyOrderId: data.id,
          amount: data.attributes.total,
        });

        if (success) {
          // optionally send an email => welcome to our platform, etc
        }
      }

      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      console.log("Webhook error:", error);
      return new Response("Error processing webhook", {
        status: 400,
      });
    }
  }),
});

export default http;
