import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  ExternalLink,
  Bug,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export function DevTestHarness() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [testQuoteId, setTestQuoteId] = useState("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  // Only show in development
  const isDev = import.meta.env.DEV || window.location.hostname.includes("lovableproject.com");
  if (!isDev) return null;

  const addResult = (step: string, success: boolean, message: string) => {
    setResults((prev) => [
      ...prev,
      { step, success, message, timestamp: new Date() },
    ]);
  };

  const runFullTest = async () => {
    if (!company || !testQuoteId) {
      toast({
        title: "Missing information",
        description: "Please enter a quote ID to test",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setResults([]);

    try {
      // Step 1: Verify quote exists
      addResult("Fetch Quote", true, "Starting...");
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", testQuoteId)
        .single();

      if (quoteError || !quote) {
        addResult("Fetch Quote", false, `Quote not found: ${quoteError?.message}`);
        return;
      }
      addResult("Fetch Quote", true, `Found ${quote.reference} for ${quote.customer_name}`);

      // Step 2: Test PDF generation
      addResult("PDF Generation", true, "Generating PDF...");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        addResult("PDF Generation", false, "Not authenticated");
        return;
      }

      const pdfResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ quoteId: testQuoteId }),
        }
      );

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => ({}));
        addResult("PDF Generation", false, `Failed: ${errorData.error || pdfResponse.statusText}`);
      } else {
        const blob = await pdfResponse.blob();
        addResult("PDF Generation", true, `PDF generated (${(blob.size / 1024).toFixed(1)}KB)`);
      }

      // Step 3: Test email sending (test mode)
      addResult("Email Send (Test)", true, "Sending test email to your company email...");
      const sendResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ quoteId: testQuoteId, testMode: true }),
        }
      );

      const sendResult = await sendResponse.json();

      if (!sendResponse.ok) {
        addResult("Email Send (Test)", false, `Failed: ${sendResult.error || "Unknown error"}`);
      } else {
        addResult("Email Send (Test)", true, `Email sent to ${company.email}`);
      }

      // Step 4: Test customer view URL
      const customerUrl = `${window.location.origin}/q/${testQuoteId}`;
      addResult("Customer View URL", true, customerUrl);

      toast({
        title: "Test complete",
        description: "Check results below",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addResult("Test Error", false, errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const openCustomerView = () => {
    if (!testQuoteId) return;
    window.open(`/q/${testQuoteId}`, "_blank");
  };

  const copyCustomerLink = async () => {
    if (!testQuoteId) return;
    const url = `${window.location.origin}/q/${testQuoteId}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: url,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
          >
            <Bug className="w-4 h-4 mr-1" />
            Dev Tools
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="w-96 mt-2 shadow-lg border-amber-200">
            <CardHeader className="pb-3 bg-amber-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Quote Testing Harness
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testQuoteId" className="text-xs">
                  Quote ID to Test
                </Label>
                <Input
                  id="testQuoteId"
                  placeholder="Paste quote UUID here"
                  value={testQuoteId}
                  onChange={(e) => setTestQuoteId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={runFullTest}
                  disabled={testing || !testQuoteId}
                  className="flex-1"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1" />
                  )}
                  Run Full Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openCustomerView}
                  disabled={!testQuoteId}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCustomerLink}
                  disabled={!testQuoteId}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {results.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 text-xs p-2 rounded ${
                        result.success
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{result.step}</p>
                        <p className="text-xs opacity-80 break-all">
                          {result.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Test mode sends emails to your company email
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
