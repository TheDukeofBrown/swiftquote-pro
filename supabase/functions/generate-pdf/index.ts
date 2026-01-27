import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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

interface Quote {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string | null;
  job_address: string | null;
  notes: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
  valid_until: string | null;
}

interface Company {
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  trade: string;
  vat_registered: boolean | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claimsData.claims.sub;
    
    // Get quote ID from request
    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: "Quote ID required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Fetch quote with company info
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote fetch error:", quoteError);
      return new Response(JSON.stringify({ error: "Quote not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Verify quote belongs to user's company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", quote.company_id)
      .eq("user_id", userId)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Fetch quote items
    const { data: items, error: itemsError } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order");

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
    }

    // Increment usage
    await supabase.rpc("increment_usage", { 
      p_company_id: company.id, 
      p_metric: "pdfs_generated" 
    });

    // Generate PDF
    const pdf = generateQuotePDF(quote, company, items || []);
    const pdfBytes = pdf.output("arraybuffer");

    console.log(`PDF generated for quote ${quote.reference}`);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.reference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateQuotePDF(quote: Quote, company: Company, items: QuoteItem[]): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Brand colors by trade
  const tradeColors: Record<string, [number, number, number]> = {
    plumber: [56, 189, 248], // Blue
    electrician: [251, 191, 36], // Amber
    plasterer: [251, 146, 60], // Orange
    builder: [100, 116, 139], // Slate
  };
  const brandColor = tradeColors[company.trade] || [100, 116, 139];

  // Brand names by trade
  const tradeNames: Record<string, string> = {
    plumber: "PlumbQuote",
    electrician: "SparkQuote",
    plasterer: "PlasterQuote",
    builder: "BuildQuote",
  };
  const brandName = tradeNames[company.trade] || "QuoteTrack";

  // Header bar
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Company name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company.business_name, margin, 15);

  // Brand name
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Powered by ${brandName}`, margin, 25);

  // Quote reference on right
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(quote.reference, pageWidth - margin, 15, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(createdDate, pageWidth - margin, 25, { align: "right" });

  y = 50;

  // Reset text color
  doc.setTextColor(30, 41, 59);

  // Two columns: Company info | Customer info
  const colWidth = (pageWidth - margin * 2 - 20) / 2;

  // Company details
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("FROM", margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(company.business_name, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (company.email) {
    doc.text(company.email, margin, y);
    y += 4;
  }
  if (company.phone) {
    doc.text(company.phone, margin, y);
    y += 4;
  }
  if (company.address) {
    const addressLines = doc.splitTextToSize(company.address, colWidth);
    doc.text(addressLines, margin, y);
  }

  // Customer details (right column)
  let yRight = 50;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TO", margin + colWidth + 20, yRight);
  yRight += 6;

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(quote.customer_name, margin + colWidth + 20, yRight);
  yRight += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (quote.customer_email) {
    doc.text(quote.customer_email, margin + colWidth + 20, yRight);
    yRight += 4;
  }
  if (quote.job_address) {
    const jobAddressLines = doc.splitTextToSize(quote.job_address, colWidth);
    doc.text(jobAddressLines, margin + colWidth + 20, yRight);
  }

  y = Math.max(y, yRight) + 15;

  // Items table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Description", margin + 3, y + 5.5);
  doc.text("Qty", pageWidth - margin - 75, y + 5.5);
  doc.text("Unit Price", pageWidth - margin - 50, y + 5.5);
  doc.text("Total", pageWidth - margin - 15, y + 5.5, { align: "right" });

  y += 12;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);

  for (const item of items) {
    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines, margin + 3, y);
    doc.text(String(item.quantity), pageWidth - margin - 75, y);
    doc.text(formatCurrency(item.unit_price), pageWidth - margin - 50, y);
    doc.text(formatCurrency(item.line_total), pageWidth - margin - 3, y, { align: "right" });
    y += descLines.length * 5 + 3;

    // Add page if needed
    if (y > 260) {
      doc.addPage();
      y = margin;
    }
  }

  y += 5;

  // Totals section
  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.text("Subtotal", pageWidth - margin - 80, y);
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin - 3, y, { align: "right" });
  y += 6;

  if (quote.vat_amount > 0) {
    doc.text("VAT", pageWidth - margin - 80, y);
    doc.text(formatCurrency(quote.vat_amount), pageWidth - margin - 3, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", pageWidth - margin - 80, y + 2);
  doc.text(formatCurrency(quote.total), pageWidth - margin - 3, y + 2, { align: "right" });

  y += 20;

  // Notes
  if (quote.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Notes", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by ${brandName}`, pageWidth / 2, footerY, { align: "center" });

  return doc;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
