import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const quoteId = url.searchParams.get("id");

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: "Quote ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - Fetch quote for viewing
    if (req.method === "GET") {
      // Fetch quote with company info
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .maybeSingle();

      if (quoteError) {
        console.error("Quote fetch error:", quoteError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch quote" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only allow viewing of sent quotes (not drafts)
      if (quote.status === "draft") {
        return new Response(
          JSON.stringify({ error: "This quote is not yet available" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch company info
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("business_name, email, phone, address, trade, logo_url, vat_registered, vat_rate")
        .eq("id", quote.company_id)
        .single();

      if (companyError) {
        console.error("Company fetch error:", companyError);
      }

      // Fetch quote items
      const { data: items, error: itemsError } = await supabase
        .from("quote_items")
        .select("description, item_type, quantity, unit_price, line_total")
        .eq("quote_id", quoteId)
        .order("sort_order");

      if (itemsError) {
        console.error("Items fetch error:", itemsError);
      }

      // Mark as viewed if not already
      if (!quote.viewed_at && quote.status === "sent") {
        await supabase
          .from("quotes")
          .update({ 
            viewed_at: new Date().toISOString(),
            status: "viewed"
          })
          .eq("id", quoteId);
        
        console.log(`Quote ${quote.reference} marked as viewed`);
      }

      // Return sanitized quote data (no internal IDs exposed)
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

      // Fetch current quote status
      const { data: quote, error: fetchError } = await supabase
        .from("quotes")
        .select("status, accepted_at, declined_at")
        .eq("id", quoteId)
        .maybeSingle();

      if (fetchError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Don't allow changes if already accepted or declined
      if (quote.status === "accepted" || quote.status === "declined") {
        return new Response(
          JSON.stringify({ 
            error: `This quote has already been ${quote.status}`,
            status: quote.status
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update quote
      const updateData = action === "accept"
        ? { status: "accepted", accepted_at: new Date().toISOString() }
        : { status: "declined", declined_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", quoteId);

      if (updateError) {
        console.error("Quote update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update quote" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Quote ${quoteId} ${action}ed`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: action === "accept" ? "accepted" : "declined"
        }),
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
