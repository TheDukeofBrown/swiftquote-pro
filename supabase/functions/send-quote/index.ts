import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  status: string;
  company_id: string;
}

interface Company {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  trade: string;
  vat_registered: boolean | null;
  vat_rate: number | null;
  logo_url: string | null;
}

// Trade brand colors and names
const tradeColors: Record<string, [number, number, number]> = {
  plumber: [56, 189, 248],
  electrician: [59, 130, 246],
  plasterer: [100, 116, 139],
  builder: [51, 65, 85],
  painter: [20, 184, 166],
  roofer: [71, 85, 105],
};

const tradeNames: Record<string, string> = {
  plumber: "PlumbQuote",
  electrician: "SparkQuote",
  plasterer: "PlasterQuote",
  builder: "BuildQuote",
  painter: "PaintQuote",
  roofer: "RoofQuote",
};

// Event logging helpers
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
    console.log(`Logged quote event: ${eventType}`);
  } catch (err) {
    console.error("Failed to log quote event:", err);
  }
}

async function logEmailEvent(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  quoteId: string,
  toEmail: string,
  subject: string,
  status: "sent" | "failed",
  error?: string,
  providerMessageId?: string
) {
  try {
    await supabase
      .from("email_events")
      .insert({
        company_id: companyId,
        quote_id: quoteId,
        provider: "resend",
        to_email: toEmail,
        subject,
        status,
        error: error || null,
        provider_message_id: providerMessageId || null,
      });
    console.log(`Logged email event: ${status}`);
  } catch (err) {
    console.error("Failed to log email event:", err);
  }
}

async function isCompanyLocked(supabase: ReturnType<typeof createClient>, companyId: string): Promise<boolean> {
  const { data } = await supabase
    .from("company_flags")
    .select("is_locked")
    .eq("company_id", companyId)
    .maybeSingle();
  return data?.is_locked === true;
}

Deno.serve(async (req) => {
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

    // Service role client for logging events
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { quoteId, testMode } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: "Quote ID required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Processing send-quote for ${quoteId}, testMode: ${testMode}`);

    // Fetch quote
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
      .eq("user_id", user.id)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check if company is locked
    if (await isCompanyLocked(serviceClient, company.id)) {
      return new Response(JSON.stringify({ 
        error: "Account locked – contact support",
        code: "COMPANY_LOCKED"
      }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Validate quote can be sent
    if (!quote.customer_email && !testMode) {
      return new Response(JSON.stringify({ 
        error: "Customer email required",
        code: "NO_EMAIL"
      }), { 
        status: 400, 
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
    console.log("Generating PDF...");
    let pdfBase64: string;
    try {
      const pdfDoc = generateQuotePDF(quote, company, items || [], logoBase64);
      pdfBase64 = pdfDoc.output("datauristring").split(",")[1];
      console.log("PDF generated successfully");
      
      // Log PDF generated event
      await logQuoteEvent(serviceClient, company.id, quoteId, "pdf_generated", {
        items_count: items?.length || 0,
        total: quote.total,
      });
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      await logQuoteEvent(serviceClient, company.id, quoteId, "pdf_generated", {
        error: pdfError instanceof Error ? pdfError.message : "Unknown error",
        success: false,
      });
      return new Response(JSON.stringify({ 
        error: "Failed to generate PDF",
        code: "PDF_FAILED"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Determine recipient email
    const recipientEmail = testMode ? company.email : quote.customer_email;
    
    if (!recipientEmail) {
      return new Response(JSON.stringify({ 
        error: "No recipient email available",
        code: "NO_RECIPIENT"
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Generate public token for this quote
    const { data: tokenData, error: tokenError } = await serviceClient
      .from("quote_tokens")
      .insert({ quote_id: quoteId })
      .select("token")
      .single();

    if (tokenError) {
      console.error("Token generation error:", tokenError);
      return new Response(JSON.stringify({ 
        error: "Failed to generate secure quote link",
        code: "TOKEN_FAILED"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Build customer view URL with token
    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://quoteready.uk";
    const customerViewUrl = `${baseUrl}/q/${tokenData.token}`;
    const brandName = tradeNames[company.trade] || "QuoteReady";
    const emailSubject = `Quote ${quote.reference} from ${company.business_name}`;

    // Send email
    console.log(`Sending email to ${recipientEmail}...`);
    const emailResult = await resend.emails.send({
      from: `${company.business_name} <quotes@quoteready.uk>`,
      to: [recipientEmail],
      subject: emailSubject,
      html: generateEmailHTML(quote, company, brandName, customerViewUrl, testMode),
      attachments: [
        {
          filename: `${quote.reference}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      console.error("Email send error:", emailResult.error);
      
      // Log failed email event
      await logEmailEvent(
        serviceClient,
        company.id,
        quoteId,
        recipientEmail,
        emailSubject,
        "failed",
        emailResult.error.message
      );
      
      // Log failed quote event
      await logQuoteEvent(serviceClient, company.id, quoteId, "email_failed", {
        to_email: recipientEmail,
        error: emailResult.error.message,
      });
      
      return new Response(JSON.stringify({ 
        error: "Failed to send email",
        details: emailResult.error.message,
        code: "EMAIL_FAILED"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("Email sent successfully:", emailResult.data?.id);

    // Log successful email event
    await logEmailEvent(
      serviceClient,
      company.id,
      quoteId,
      recipientEmail,
      emailSubject,
      "sent",
      undefined,
      emailResult.data?.id
    );
    
    // Log email sent quote event
    await logQuoteEvent(serviceClient, company.id, quoteId, "email_sent", {
      to_email: recipientEmail,
      provider_message_id: emailResult.data?.id,
      test_mode: testMode || false,
    });

    // Update quote status to "sent" ONLY after email succeeds
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ 
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("id", quoteId);

    if (updateError) {
      console.error("Quote status update error:", updateError);
      // Email was sent but status update failed - log but don't fail
    } else {
      // Log status change event
      await logQuoteEvent(serviceClient, company.id, quoteId, "status_changed", {
        from: quote.status,
        to: "sent",
      });
    }

    // Increment usage
    await supabase.rpc("increment_usage", { 
      p_company_id: company.id, 
      p_metric: "quotes_sent" 
    });
    await supabase.rpc("increment_usage", { 
      p_company_id: company.id, 
      p_metric: "pdfs_generated" 
    });

    console.log(`Quote ${quote.reference} sent successfully to ${recipientEmail}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Quote sent to ${recipientEmail}`,
      emailId: emailResult.data?.id,
      customerViewUrl,
      testMode: testMode || false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Send quote error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: "Failed to send quote",
      details: errorMessage,
      code: "INTERNAL_ERROR"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateEmailHTML(
  quote: Quote, 
  company: Company, 
  brandName: string,
  customerViewUrl: string,
  testMode: boolean
): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.reference}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${testMode ? '<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;"><strong>🧪 TEST MODE</strong> - This is a test email sent to yourself</div>' : ''}
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0 0 5px 0;">${company.business_name}</h1>
        <p style="color: #64748b; margin: 0; font-size: 14px;">
          ${[company.phone, company.email].filter(Boolean).join(" • ")}
        </p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px 0;">Hi ${quote.customer_name},</p>
        <p style="margin: 0 0 20px 0;">Please find attached your quote <strong>${quote.reference}</strong>.</p>
        
        <div style="background: #fff; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px;">Quote Total</p>
          <p style="font-size: 32px; font-weight: bold; color: #0f172a; margin: 0;">
            ${formatCurrency(quote.total)}
          </p>
          ${quote.vat_amount > 0 ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">Including VAT</p>` : ''}
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${customerViewUrl}" 
           style="display: inline-block; background: #22c55e; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          ✓ View & Accept Quote
        </a>
        <p style="color: #64748b; font-size: 12px; margin-top: 12px;">
          Click to view full details and accept online
        </p>
      </div>
      
      ${quote.job_address ? `
        <div style="margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 5px 0;">Job Address</p>
          <p style="margin: 0;">${quote.job_address}</p>
        </div>
      ` : ''}
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      
      <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
        Questions? Reply to this email or call ${company.phone || 'us'}.
      </p>
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
        ${brandName} — Powered by QuoteReady
      </p>
    </body>
    </html>
  `;
}

function generateQuotePDF(quote: Quote, company: Company, items: QuoteItem[], logoBase64: string | null): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  const brandColor = tradeColors[company.trade] || [100, 116, 139];
  const brandName = tradeNames[company.trade] || "QuoteReady";

  // Header
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  let textStartX = margin;
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 12, 20, 14, "F");
      doc.addImage(logoBase64, "PNG", margin + 2, 8, 20, 24, undefined, "FAST");
      textStartX = margin + 28;
    } catch (e) {
      console.error("Failed to add logo to PDF:", e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(company.business_name, textStartX, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let contactLine = "";
  if (company.phone) contactLine += company.phone;
  if (company.email) contactLine += (contactLine ? "  •  " : "") + company.email;
  if (contactLine) {
    doc.text(contactLine, textStartX, 28);
  }

  // Brand name on left
  doc.setFontSize(8);
  doc.text(brandName, textStartX, 36);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTE", pageWidth - margin, 14, { align: "right" });
  doc.setFontSize(14);
  doc.text(quote.reference, pageWidth - margin, 24, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(createdDate, pageWidth - margin, 34, { align: "right" });

  y = 55;
  doc.setTextColor(30, 41, 59);

  // Customer details
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
  if (quote.job_address) {
    const addressLines = doc.splitTextToSize(quote.job_address, pageWidth - margin * 2);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 5;
  }

  y += 10;

  // Items table
  const colWidths = { desc: 90, qty: 25, unit: 35, total: 35 };

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

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);

  for (const item of items) {
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

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  }

  y += 5;

  // Totals
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

  y += 3;
  doc.setFillColor(...brandColor);
  doc.rect(totalsX - 5, y - 5, pageWidth - margin - totalsX + 9, 14, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", totalsX, y + 4);
  doc.text(formatCurrency(quote.total), pageWidth - margin - 4, y + 4, { align: "right" });

  y += 25;

  // Notes
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

  // Accept button visual
  if (y < pageHeight - 50) {
    y = Math.max(y + 15, pageHeight - 60);
    
    const buttonWidth = 140;
    const buttonX = (pageWidth - buttonWidth) / 2;
    
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(buttonX, y, buttonWidth, 14, 3, 3, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("✓ Accept This Quote", pageWidth / 2, y + 9.5, { align: "center" });
    
    y += 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("View online to accept or decline", pageWidth / 2, y, { align: "center" });
  }

  // Footer
  const footerY = pageHeight - 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${brandName} — Powered by QuoteReady`, pageWidth / 2, footerY, { align: "center" });

  return doc;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
