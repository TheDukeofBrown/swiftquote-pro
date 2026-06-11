// Stripe Connect webhook (Accounts v2). Verifies STRIPE_CONNECT_WEBHOOK_SECRET.
// Handles: checkout.session.completed (mark payment paid), account.updated (sync status).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const whSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, whSecret);
  } catch (e) {
    console.error("[CONNECT-WH] sig verify failed", (e as Error).message);
    return new Response("bad sig", { status: 400, headers: corsHeaders });
  }

  console.log("[CONNECT-WH]", event.type, event.account || "platform");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const paymentId = s.metadata?.quote_payment_id;
        const quoteId = s.metadata?.quote_id;
        if (paymentId) {
          await admin
            .from("quote_payments")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id:
                typeof s.payment_intent === "string" ? s.payment_intent : null,
            })
            .eq("id", paymentId);
        }
        if (quoteId) {
          await admin.from("quote_events").insert({
            quote_id: quoteId,
            event_type: "payment_received",
            metadata: { session_id: s.id, amount_total: s.amount_total },
          });
        }
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const status =
          acct.charges_enabled && acct.payouts_enabled && acct.details_submitted
            ? "active"
            : "pending";
        await admin
          .from("companies")
          .update({ stripe_connect_status: status })
          .eq("stripe_account_id", acct.id);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[CONNECT-WH] handler error", (e as Error).message);
    return new Response("handler error", { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
