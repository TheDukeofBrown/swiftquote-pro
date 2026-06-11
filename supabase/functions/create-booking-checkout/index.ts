// Public endpoint: create a Stripe Checkout Session for a booking payment.
// Direct charge on the connected account (Accounts v2). Stripe collects fees from the connected account.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { token, payment_id } = body as { token: string; payment_id?: string };
    if (!token) throw new Error("token required");

    // Resolve quote via token
    const { data: tok } = await admin
      .from("quote_tokens")
      .select("quote_id, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!tok) throw new Error("Invalid token");
    if (tok.expires_at && new Date(tok.expires_at) < new Date()) throw new Error("Token expired");

    const { data: quote } = await admin
      .from("quotes")
      .select(
        "id, quote_number, company_id, customer_id, total, currency, payment_mode, booking_payment_amount"
      )
      .eq("id", tok.quote_id)
      .maybeSingle();
    if (!quote) throw new Error("Quote not found");

    const { data: company } = await admin
      .from("companies")
      .select("id, name, stripe_account_id, stripe_connect_status")
      .eq("id", quote.company_id)
      .maybeSingle();
    if (!company?.stripe_account_id || company.stripe_connect_status !== "active") {
      throw new Error("Trade has not completed Stripe Connect onboarding");
    }

    // Find or create the quote_payments row
    let payment;
    if (payment_id) {
      const { data } = await admin
        .from("quote_payments")
        .select("*")
        .eq("id", payment_id)
        .eq("quote_id", quote.id)
        .maybeSingle();
      payment = data;
    } else {
      const amount = Number(quote.booking_payment_amount || 0);
      if (!amount) throw new Error("No booking amount on quote");
      const { data } = await admin
        .from("quote_payments")
        .insert({
          quote_id: quote.id,
          company_id: quote.company_id,
          stage_label: "Booking payment",
          amount,
          currency: (quote.currency || "GBP").toLowerCase(),
          status: "pending",
        })
        .select("*")
        .single();
      payment = data;
    }
    if (!payment) throw new Error("Could not load payment");
    if (payment.status === "paid") throw new Error("Already paid");

    const origin = req.headers.get("origin") || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Direct charge on the connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: payment.currency,
              unit_amount: Math.round(Number(payment.amount) * 100),
              product_data: {
                name: `${payment.stage_label} — Quote ${quote.quote_number}`,
              },
            },
          },
        ],
        success_url: `${origin}/q/${token}?paid=1`,
        cancel_url: `${origin}/q/${token}`,
        metadata: {
          quote_id: quote.id,
          quote_payment_id: payment.id,
          company_id: company.id,
        },
        payment_intent_data: {
          metadata: {
            quote_id: quote.id,
            quote_payment_id: payment.id,
            company_id: company.id,
          },
        },
      },
      { stripeAccount: company.stripe_account_id }
    );

    await admin
      .from("quote_payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payment.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
