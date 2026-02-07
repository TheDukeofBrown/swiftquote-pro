import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase.rpc("is_admin", {
          _user_id: user.id,
        });

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          setAdminRole(null);
        } else {
          setIsAdmin(data === true);
          
          if (data === true) {
            const { data: roleData } = await supabase.rpc("get_admin_role", {
              _user_id: user.id,
            });
            setAdminRole(roleData);
          }
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
        setAdminRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, adminRole, loading };
}

export function useAdminMetrics(dateFrom: Date, dateTo: Date) {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_metrics", {
        p_date_from: dateFrom.toISOString(),
        p_date_to: dateTo.toISOString(),
      });

      if (error) throw error;
      setMetrics(data as Record<string, number>);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

export function useAdminCompanies() {
  const [companies, setCompanies] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_companies");
      if (error) throw error;
      setCompanies(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, loading, error, refetch: fetchCompanies };
}

export function useAdminQuotes() {
  const [quotes, setQuotes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_quotes");
      if (error) throw error;
      setQuotes(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch quotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return { quotes, loading, error, refetch: fetchQuotes };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_users");
      if (error) throw error;
      setUsers(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

export function useAdminAuditLog(limit = 100, offset = 0) {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_audit_log", {
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      setLogs(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

export function useAdminActions() {
  const lockCompany = async (companyId: string, reason: string) => {
    const { error } = await supabase.rpc("admin_lock_company", {
      p_company_id: companyId,
      p_reason: reason,
    });
    if (error) throw error;
    return true;
  };

  const unlockCompany = async (companyId: string) => {
    const { error } = await supabase.rpc("admin_unlock_company", {
      p_company_id: companyId,
    });
    if (error) throw error;
    return true;
  };

  const setCompanyNote = async (companyId: string, note: string) => {
    const { error } = await supabase.rpc("admin_set_company_note", {
      p_company_id: companyId,
      p_note: note,
    });
    if (error) throw error;
    return true;
  };

  const getCompanyDetail = async (companyId: string) => {
    const { data, error } = await supabase.rpc("admin_get_company_detail", {
      p_company_id: companyId,
    });
    if (error) throw error;
    return data;
  };

  return { lockCompany, unlockCompany, setCompanyNote, getCompanyDetail };
}
