// Stripe Connect onboarding — Accounts v2, direct charges, fees on connected account.
// Hosted onboarding via accountLinks.create. No OAuth, no client_id.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[CONNECT-ONBOARD] ${s}${d ? " " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userErr } = await supa.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const returnUrl: string =
      body.return_url || `${req.headers.get("origin") || ""}/settings?tab=payments`;
    const refreshUrl: string = body.refresh_url || returnUrl;

    const { data: company, error: cErr } = await supa
      .from("companies")
      .select("id, stripe_account_id, stripe_connect_status, business_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!company) throw new Error("No company for user");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let accountId = company.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: "full" },
          fees: { payer: "account" },
          losses: { payments: "stripe" },
          requirement_collection: "stripe",
        },
        country: "GB",
        email: company.email || user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: company.business_name || undefined,
        },
        metadata: { company_id: company.id, user_id: user.id },
      });
      accountId = account.id;

      await admin
        .from("companies")
        .update({
          stripe_account_id: accountId,
          stripe_connect_status: "pending",
        })
        .eq("id", company.id);
      log("Account created", { accountId });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
      collection_options: { fields: "currently_due" },
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    log("Error", { message: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
