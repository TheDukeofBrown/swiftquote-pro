import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { AlertTriangle } from "lucide-react";

export default function AccountLockedBanner() {
  const { company } = useCompany();
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;

    const checkLockStatus = async () => {
      const { data } = await supabase
        .from("company_flags")
        .select("is_locked, lock_reason")
        .eq("company_id", company.id)
        .maybeSingle();

      if (data) {
        setIsLocked(data.is_locked || false);
        setLockReason(data.lock_reason);
      }
    };

    checkLockStatus();
  }, [company]);

  if (!isLocked) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <div>
        <p className="font-medium">Account locked – contact support</p>
        {lockReason && (
          <p className="text-sm opacity-80">{lockReason}</p>
        )}
      </div>
    </div>
  );
}
