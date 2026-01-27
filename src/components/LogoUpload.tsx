import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";

export function LogoUpload() {
  const { user } = useAuth();
  const { company, refetch } = useCompany();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !company) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, or SVG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be under 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete existing logo if present
      if (company.logo_url) {
        const oldPath = company.logo_url.split("/company-logos/")[1];
        if (oldPath) {
          await supabase.storage.from("company-logos").remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      // Update company with logo URL
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", company.id);

      if (updateError) throw updateError;

      await refetch();
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been updated.",
      });
    } catch (err: any) {
      console.error("Logo upload error:", err);
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!company?.logo_url) return;

    setDeleting(true);
    try {
      // Extract path from URL
      const path = company.logo_url.split("/company-logos/")[1];
      if (path) {
        await supabase.storage.from("company-logos").remove([path]);
      }

      // Update company
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", company.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Logo removed",
        description: "Your company logo has been removed.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove logo",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Company Logo</Label>
      <p className="text-sm text-muted-foreground">
        Upload your logo to display on PDF quotes (max 2MB, PNG/JPG/SVG)
      </p>
      
      <div className="flex items-center gap-4">
        {/* Logo preview */}
        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
          {company?.logo_url ? (
            <img
              src={company.logo_url}
              alt="Company logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {company?.logo_url ? "Change Logo" : "Upload Logo"}
          </Button>
          
          {company?.logo_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
