import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteItem {
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "const data = encoder.encode(ip + "quoteready-salt-2024");");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  token: string,
  ipHash: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const windowKey = windowStart.toISOString();

  // Check token rate limit (30/hour)
  const tokenKey = `token:${token}`;
  const { data: tokenCount } = await supabase
    .from("rate_limit_counters")
    .select("count")
    .eq("key", tokenKey)
    .eq("window_start", windowKey)
    .maybeSingle();

  if (tokenCount && tokenCount.count >= 30) {
    const nextWindow = new Date(windowStart.getTime() + 60 * 60 * 1000);
    return { allowed: false, retryAfter: Math.ceil((nextWindow.getTime() - now.getTime()) / 1000) };
  }

  // Check IP rate limit (60/hour)
  const ipKey = `ip:${ipHash}`;
  const { data: ipCount } = await supabase
    .from("rate_limit_counters")
    .select("count")
    .eq("key", ipKey)
    .eq("window_start", windowKey)
    .maybeSingle();

  if (ipCount && ipCount.count >= 60) {
    const nextWindow = new Date(windowStart.getTime() + 60 * 60 * 1000);
    return { allowed: false, retryAfter: Math.ceil((nextWindow.getTime() - now.getTime()) / 1000) };
  }

  // Increment counters
  for (const key of [tokenKey, ipKey]) {
    await supabase.rpc("increment_rate_limit" as any, { p_key: key, p_window: windowKey });
  }

  return { allowed: true };
}

async function logQuoteEvent(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  quoteId: string,
  eventType: string,
  payload: Record<string, unknown> = {}
) {
  try {
    await supabase
      .from("quote_events")
      .insert({
        company_id: companyId,
        quote_id: quoteId,
        event_type: eventType,
        payload,
      });
    console.log(`Logged quote event: ${eventType} for quote ${quoteId}`);
  } catch (err) {
    console.error("Failed to log quote event:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    // Legacy support: also accept id param for backward compatibility during migration
    const legacyId = url.searchParams.get("id");

    if (!token && !legacyId) {
      return new Response(
        JSON.stringify({ error: "Token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await hashIP(clientIP);
    const rateLimitKey = token || legacyId || "unknown";

    const rateCheck = await checkRateLimit(supabase, rateLimitKey, ipHash);
    if (!rateCheck.allowed) {
      // Log rate limit event
      console.warn(`Rate limited: token=${rateLimitKey}, ipHash=${ipHash.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter || 3600)
          } 
        }
      );
    }

    let quoteId: string;

    if (token) {
      // Token-based lookup
      const { data: tokenRecord, error: tokenError } = await supabase
        .from("quote_tokens")
        .select("quote_id, expires_at, revoked_at")
        .eq("token", token)
        .maybeSingle();

      if (tokenError || !tokenRecord) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenRecord.revoked_at) {
        return new Response(
          JSON.stringify({ error: "This quote link has been revoked. Please contact the business for a new link.", code: "TOKEN_REVOKED" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        // Fetch company name for friendly message
        const { data: quote } = await supabase
          .from("quotes")
          .select("company_id")
          .eq("id", tokenRecord.quote_id)
          .maybeSingle();
        
        let companyName = "the business";
        if (quote) {
          const { data: company } = await supabase
            .from("companies")
            .select("business_name")
            .eq("id", quote.company_id)
            .maybeSingle();
          if (company) companyName = company.business_name;
        }

        return new Response(
          JSON.stringify({ 
            error: `This quote link has expired. Please contact ${companyName} for a new link.`,
            code: "TOKEN_EXPIRED",
            company_name: companyName
          }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      quoteId = tokenRecord.quote_id;
    } else {
      // Legacy ID-based lookup (backward compatibility)
      quoteId = legacyId!;
    }

    // GET - Fetch quote for viewing
    if (req.method === "GET") {
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .maybeSingle();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (quote.status === "draft") {
        return new Response(
          JSON.stringify({ error: "This quote is not yet available" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: company } = await supabase
        .from("companies")
        .select("business_name, email, phone, address, trade, logo_url, vat_registered, vat_rate")
        .eq("id", quote.company_id)
        .single();

      const { data: items } = await supabase
        .from("quote_items")
        .select("description, item_type, quantity, unit_price, line_total")
        .eq("quote_id", quoteId)
        .order("sort_order");

      // Mark as viewed if not already
      if (!quote.viewed_at && quote.status === "sent") {
        await supabase
          .from("quotes")
          .update({ viewed_at: new Date().toISOString(), status: "viewed" })
          .eq("id", quoteId);
        
        await logQuoteEvent(supabase, quote.company_id, quoteId, "viewed", {
          viewed_at: new Date().toISOString(),
          previous_status: quote.status,
          ip_hash: ipHash.substring(0, 8),
        });
      }

      return new Response(
        JSON.stringify({
          reference: quote.reference,
          customer_name: quote.customer_name,
          job_address: quote.job_address,
          notes: quote.notes,
          subtotal: quote.subtotal,
          vat_amount: quote.vat_amount,
          total: quote.total,
          valid_until: quote.valid_until,
          created_at: quote.created_at,
          status: quote.status,
          accepted_at: quote.accepted_at,
          declined_at: quote.declined_at,
          company: company || null,
          items: items || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Accept or decline quote
    if (req.method === "POST") {
      const { action } = await req.json();

      if (!["accept", "decline"].includes(action)) {
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: quote, error: fetchError } = await supabase
        .from("quotes")
        .select("status, accepted_at, declined_at, company_id")
        .eq("id", quoteId)
        .maybeSingle();

      if (fetchError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent multiple accepts/declines
      if (quote.status === "accepted" || quote.status === "declined") {
        return new Response(
          JSON.stringify({ 
            error: `This quote has already been ${quote.status}`,
            status: quote.status
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData = action === "accept"
        ? { status: "accepted", accepted_at: new Date().toISOString() }
        : { status: "declined", declined_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", quoteId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update quote" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const eventType = action === "accept" ? "accepted" : "declined";
      await logQuoteEvent(supabase, quote.company_id, quoteId, eventType, {
        previous_status: quote.status,
        timestamp: new Date().toISOString(),
        ip_hash: ipHash.substring(0, 8),
      });

      return new Response(
        JSON.stringify({ success: true, status: action === "accept" ? "accepted" : "declined" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quote public error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
