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
  vat_rate: number | null;
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

    // Fetch logo if available
    let logoBase64: string | null = null;
    if (company.logo_url) {
      try {
        const logoResponse = await fetch(company.logo_url);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(logoBlob).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          const contentType = logoResponse.headers.get("content-type") || "image/png";
          logoBase64 = `data:${contentType};base64,${base64}`;
        }
      } catch (logoErr) {
        console.error("Failed to fetch logo:", logoErr);
      }
    }

    // Generate PDF
    const pdf = generateQuotePDF(quote, company, items || [], logoBase64);
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

function generateQuotePDF(quote: Quote, company: Company, items: QuoteItem[], logoBase64: string | null): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Brand colors by trade (RGB values matching brand hues)
  const tradeColors: Record<string, [number, number, number]> = {
    plumber: [56, 189, 248], // Blue
    electrician: [59, 130, 246], // Navy / Electric blue
    plasterer: [100, 116, 139], // Neutral grey / Slate
    builder: [51, 65, 85], // Slate / charcoal
    painter: [20, 184, 166], // Deep green/teal
    roofer: [71, 85, 105], // Dark grey
  };
  const brandColor = tradeColors[company.trade] || [100, 116, 139];

  // Brand names by trade
  const tradeNames: Record<string, string> = {
    plumber: "PlumbQuote",
    electrician: "SparkQuote",
    plasterer: "PlasterQuote",
    builder: "BuildQuote",
    painter: "PaintQuote",
    roofer: "RoofQuote",
  };
  const brandName = tradeNames[company.trade] || "QuoteTrack";

  // ===== HEADER =====
  // Clean header with company name prominent
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Add logo if available
  let textStartX = margin;
  if (logoBase64) {
    try {
      // Add logo - white background circle for visibility
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 12, 20, 14, "F");
      doc.addImage(logoBase64, "PNG", margin + 2, 8, 20, 24, undefined, "FAST");
      textStartX = margin + 28;
    } catch (e) {
      console.error("Failed to add logo to PDF:", e);
    }
  }

  // Company name in header (large, prominent)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(company.business_name, textStartX, 18);

  // Company contact details under name
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let contactLine = "";
  if (company.phone) contactLine += company.phone;
  if (company.email) contactLine += (contactLine ? "  •  " : "") + company.email;
  if (contactLine) {
    doc.text(contactLine, textStartX, 28);
  }

  // Quote reference on right
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTE", pageWidth - margin, 14, { align: "right" });
  doc.setFontSize(14);
  doc.text(quote.reference, pageWidth - margin, 24, { align: "right" });

  // Date under reference
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(createdDate, pageWidth - margin, 34, { align: "right" });

  y = 55;

  // Reset text color
  doc.setTextColor(30, 41, 59);

  // ===== CUSTOMER DETAILS =====
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTE FOR", margin, y);
  y += 7;

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(quote.customer_name, margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (quote.customer_email) {
    doc.text(quote.customer_email, margin, y);
    y += 5;
  }
  if (quote.job_address) {
    const addressLines = doc.splitTextToSize(quote.job_address, pageWidth - margin * 2);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 5;
  }

  y += 10;

  // ===== ITEMS TABLE =====
  // Table header
  const colWidths = {
    desc: 90,
    qty: 25,
    unit: 35,
    total: 35,
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 10, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  
  const tableX = margin + 4;
  doc.text("Description", tableX, y + 7);
  doc.text("Qty", tableX + colWidths.desc, y + 7, { align: "center" });
  doc.text("Unit Price", tableX + colWidths.desc + colWidths.qty + 10, y + 7, { align: "right" });
  doc.text("Amount", pageWidth - margin - 4, y + 7, { align: "right" });

  y += 15;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);

  for (const item of items) {
    // Check for page break
    if (y > pageHeight - 80) {
      doc.addPage();
      y = margin;
    }

    const descLines = doc.splitTextToSize(item.description, colWidths.desc - 5);
    doc.text(descLines, tableX, y);
    
    doc.text(String(item.quantity), tableX + colWidths.desc, y, { align: "center" });
    doc.text(formatCurrency(item.unit_price), tableX + colWidths.desc + colWidths.qty + 10, y, { align: "right" });
    doc.text(formatCurrency(item.line_total), pageWidth - margin - 4, y, { align: "right" });
    
    y += Math.max(descLines.length * 5, 6) + 4;

    // Light separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  }

  y += 5;

  // ===== TOTALS =====
  const totalsX = pageWidth - margin - 80;
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin - 4, y, { align: "right" });
  y += 7;

  if (quote.vat_amount > 0) {
    const vatRate = company.vat_rate || 20;
    doc.setTextColor(71, 85, 105);
    doc.text(`VAT (${vatRate}%)`, totalsX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(formatCurrency(quote.vat_amount), pageWidth - margin - 4, y, { align: "right" });
    y += 7;
  }

  // Total with background
  y += 3;
  doc.setFillColor(...brandColor);
  doc.rect(totalsX - 5, y - 5, pageWidth - margin - totalsX + 9, 14, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", totalsX, y + 4);
  doc.text(formatCurrency(quote.total), pageWidth - margin - 4, y + 4, { align: "right" });

  y += 25;

  // ===== NOTES =====
  if (quote.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Notes & Terms", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 10;
  }

  // ===== ACCEPT QUOTE BUTTON (visual representation) =====
  if (y < pageHeight - 50) {
    y = Math.max(y + 15, pageHeight - 60);
    
    // Accept button visual
    const buttonWidth = 140;
    const buttonX = (pageWidth - buttonWidth) / 2;
    
    doc.setFillColor(34, 197, 94); // Green
    doc.roundedRect(buttonX, y, buttonWidth, 14, 3, 3, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("✓ Accept This Quote", pageWidth / 2, y + 9.5, { align: "center" });
    
    y += 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Reply to this quote or contact us to accept", pageWidth / 2, y, { align: "center" });
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${brandName} — Powered by WorkQuote`, pageWidth / 2, footerY, { align: "center" });

  return doc;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
