import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe price ID to plan
function getPlanFromPriceId(priceId: string): "free" | "pro" | "business" {
  // Map your actual Stripe price IDs here
  if (priceId.includes("starter")) return "free";
  if (priceId.includes("pro")) return "pro";
  if (priceId.includes("team") || priceId.includes("business")) return "business";
  return "free";
}

// Map Stripe status to our status
function mapStripeStatus(stripeStatus: string): "trialing" | "active" | "past_due" | "canceled" | "expired" {
  switch (stripeStatus) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": 
    case "unpaid": return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "expired";
    default: return "active";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logStep("Webhook signature verification failed", { error: message });
        return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    } else {
      // For development, parse without verification
      event = JSON.parse(body);
      logStep("Webhook parsed (no signature verification)", { type: event.type });
    }

    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        logStep("Checkout completed", { companyId, customerId, subscriptionId });

        if (companyId && subscriptionId) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id || "";
          const plan = getPlanFromPriceId(priceId);

          // Update subscription in database
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan,
              status: mapStripeStatus(subscription.status),
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", companyId);

          if (error) {
            logStep("Error updating subscription", { error: error.message });
          } else {
            logStep("Subscription updated successfully");
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = subscription.metadata?.company_id;
        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = getPlanFromPriceId(priceId);

        logStep("Subscription update", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          companyId,
          plan
        });

        if (companyId) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              stripe_subscription_id: subscription.id,
              plan,
              status: mapStripeStatus(subscription.status),
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", companyId);

          if (error) {
            logStep("Error updating subscription", { error: error.message });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = subscription.metadata?.company_id;

        logStep("Subscription deleted", { subscriptionId: subscription.id, companyId });

        if (companyId) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", companyId);

          if (error) {
            logStep("Error updating canceled subscription", { error: error.message });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        logStep("Payment succeeded", { invoiceId: invoice.id, subscriptionId });

        if (subscriptionId) {
          // Reset usage counters on successful payment (new billing period)
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const companyId = subscription.metadata?.company_id;

          if (companyId) {
            // Create new usage record for new period
            const periodStart = new Date().toISOString().slice(0, 7) + "-01";
            const { error } = await supabaseAdmin
              .from("usage_records")
              .upsert({
                company_id: companyId,
                period_start: periodStart,
                quotes_created_this_month: 0,
                quotes_sent_this_month: 0,
                pdfs_generated_this_month: 0,
              }, { onConflict: "company_id,period_start" });

            if (error) {
              logStep("Error resetting usage", { error: error.message });
            } else {
              logStep("Usage counters reset for new period");
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        logStep("Payment failed", { invoiceId: invoice.id, subscriptionId });

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const companyId = subscription.metadata?.company_id;

          if (companyId) {
            const { error } = await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("company_id", companyId);

            if (error) {
              logStep("Error updating to past_due", { error: error.message });
            }
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
