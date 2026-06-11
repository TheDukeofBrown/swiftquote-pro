// Refresh a company's Stripe Connect status from Stripe (Accounts v2 hosted).
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) throw new Error("Unauthorized");

    const { data: company } = await supa
      .from("companies")
      .select("id, stripe_account_id")
      .eq("owner_id", userData.user.id)
      .maybeSingle();
    if (!company?.stripe_account_id) {
      return new Response(JSON.stringify({ status: "not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const acct = await stripe.accounts.retrieve(company.stripe_account_id);

    const status =
      acct.charges_enabled && acct.payouts_enabled && acct.details_submitted
        ? "active"
        : "pending";

    await admin
      .from("companies")
      .update({ stripe_connect_status: status })
      .eq("id", company.id);

    return new Response(
      JSON.stringify({
        status,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
        requirements: acct.requirements,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
