import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";

export type PaymentMode = "completion" | "booking" | "staged" | "account";
export type BookingType = "percent" | "fixed";

export interface StagedPayment {
  label: string;
  percent: number;
  amount: number;
}

export interface PaymentScheduleValue {
  payment_mode: PaymentMode;
  payment_terms_days?: number | null;
  booking_payment_type?: BookingType | null;
  booking_payment_value?: number | null;
  booking_payment_amount?: number | null;
  staged_payments?: StagedPayment[] | null;
}

const STAGE_SUGGESTIONS = ["On acceptance", "Week 1", "On completion"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

interface Props {
  value: PaymentScheduleValue;
  onChange: (v: PaymentScheduleValue) => void;
  total: number;
  materialsTotal: number;
  materialsThreshold: number;
}

export function PaymentScheduleSection({
  value,
  onChange,
  total,
  materialsTotal,
  materialsThreshold,
}: Props) {
  // Recalculate booking amount whenever inputs change
  useEffect(() => {
    if (value.payment_mode !== "booking") return;
    const v = Number(value.booking_payment_value || 0);
    const amt =
      value.booking_payment_type === "fixed"
        ? Math.min(v, total)
        : Math.round((total * v) / 100 * 100) / 100;
    if (amt !== Number(value.booking_payment_amount || 0)) {
      onChange({ ...value, booking_payment_amount: amt });
    }
  }, [value.payment_mode, value.booking_payment_type, value.booking_payment_value, total]);

  // Recalculate staged amounts when total changes
  useEffect(() => {
    if (value.payment_mode !== "staged" || !value.staged_payments) return;
    const updated = value.staged_payments.map((s) => ({
      ...s,
      amount: Math.round(((total * (s.percent || 0)) / 100) * 100) / 100,
    }));
    if (JSON.stringify(updated) !== JSON.stringify(value.staged_payments)) {
      onChange({ ...value, staged_payments: updated });
    }
  }, [total, value.payment_mode]);

  const stagedTotalPercent = useMemo(
    () => (value.staged_payments || []).reduce((s, x) => s + (Number(x.percent) || 0), 0),
    [value.staged_payments]
  );

  const setMode = (mode: PaymentMode) => {
    const base: PaymentScheduleValue = {
      payment_mode: mode,
      payment_terms_days: null,
      booking_payment_type: null,
      booking_payment_value: null,
      booking_payment_amount: null,
      staged_payments: null,
    };
    if (mode === "booking") {
      base.booking_payment_type = "percent";
      base.booking_payment_value = 25;
      base.booking_payment_amount = Math.round(total * 25) / 100;
    }
    if (mode === "staged") {
      base.staged_payments = [
        { label: "On acceptance", percent: 25, amount: Math.round(total * 25) / 100 },
        { label: "On completion", percent: 75, amount: Math.round(total * 75) / 100 },
      ];
    }
    if (mode === "account") base.payment_terms_days = 14;
    onChange(base);
  };

  const updateStage = (i: number, patch: Partial<StagedPayment>) => {
    const stages = [...(value.staged_payments || [])];
    const next = { ...stages[i], ...patch };
    next.amount = Math.round(((total * (Number(next.percent) || 0)) / 100) * 100) / 100;
    stages[i] = next;
    onChange({ ...value, staged_payments: stages });
  };

  const addStage = () => {
    const stages = [...(value.staged_payments || [])];
    if (stages.length >= 3) return;
    const used = stages.reduce((s, x) => s + (Number(x.percent) || 0), 0);
    const remaining = Math.max(0, 100 - used);
    const label = STAGE_SUGGESTIONS[stages.length] || `Stage ${stages.length + 1}`;
    stages.push({
      label,
      percent: remaining,
      amount: Math.round((total * remaining) / 100 * 100) / 100,
    });
    onChange({ ...value, staged_payments: stages });
  };

  const removeStage = (i: number) => {
    const stages = (value.staged_payments || []).filter((_, idx) => idx !== i);
    onChange({ ...value, staged_payments: stages });
  };

  const showThresholdNudge =
    value.payment_mode === "completion" &&
    materialsTotal > 0 &&
    materialsThreshold > 0 &&
    materialsTotal > materialsThreshold;

  const applyBookingFromNudge = () => {
    onChange({
      payment_mode: "booking",
      booking_payment_type: "percent",
      booking_payment_value: 25,
      booking_payment_amount: Math.round(total * 25) / 100,
      payment_terms_days: null,
      staged_payments: null,
    });
  };

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
      <CardContent className="pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Payment schedule</h3>
            <p className="text-xs text-muted-foreground">
              How you'd like to be paid for this job
            </p>
          </div>
        </div>

        {showThresholdNudge && (
          <button
            type="button"
            onClick={applyBookingFromNudge}
            className="w-full text-left rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 flex items-center gap-2 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition"
          >
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-900 dark:text-amber-200 flex-1">
              This job has <strong>{fmt(materialsTotal)}</strong> in materials — a
              booking payment is recommended.
            </span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
              Apply 25% →
            </span>
          </button>
        )}

        <RadioGroup
          value={value.payment_mode}
          onValueChange={(v) => setMode(v as PaymentMode)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <ModeCard id="completion" current={value.payment_mode} label="Invoice on completion" hint="No money up front" />
          <ModeCard id="booking" current={value.payment_mode} label="Booking payment" hint="Secure the job + cover materials" />
          <ModeCard id="staged" current={value.payment_mode} label="Staged payments" hint="Split across milestones" />
          <ModeCard id="account" current={value.payment_mode} label="Invoice on account" hint="Net 7 / 14 / 30 day terms" />
        </RadioGroup>

        {/* BOOKING */}
        {value.payment_mode === "booking" && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Select
                value={value.booking_payment_type || "percent"}
                onValueChange={(v) =>
                  onChange({ ...value, booking_payment_type: v as BookingType })
                }
              >
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed £</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step={value.booking_payment_type === "fixed" ? "0.01" : "1"}
                value={value.booking_payment_value ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    booking_payment_value: parseFloat(e.target.value) || 0,
                  })
                }
                className="max-w-[140px]"
              />
              <span className="text-sm text-muted-foreground">
                {value.booking_payment_type === "fixed" ? "£" : "% of total"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-background border border-border p-2">
                <div className="text-xs text-muted-foreground">Booking payment</div>
                <div className="font-semibold">
                  {fmt(Number(value.booking_payment_amount || 0))}
                </div>
              </div>
              <div className="rounded-md bg-background border border-border p-2">
                <div className="text-xs text-muted-foreground">Balance on completion</div>
                <div className="font-semibold">
                  {fmt(Math.max(total - Number(value.booking_payment_amount || 0), 0))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Customer sees: "To secure your booking and cover materials, a payment of{" "}
              <strong>{fmt(Number(value.booking_payment_amount || 0))}</strong> is due on
              acceptance. Balance of{" "}
              <strong>{fmt(Math.max(total - Number(value.booking_payment_amount || 0), 0))}</strong>{" "}
              due on completion."
            </p>
          </div>
        )}

        {/* STAGED */}
        {value.payment_mode === "staged" && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
            {(value.staged_payments || []).map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Stage</Label>
                  <Input
                    value={s.label}
                    onChange={(e) => updateStage(i, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">%</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={s.percent}
                    onChange={(e) =>
                      updateStage(i, { percent: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="h-9 px-3 flex items-center bg-background rounded-md border border-border font-medium text-sm">
                    {fmt(s.amount)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStage(i)}
                  disabled={(value.staged_payments || []).length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={addStage}
                disabled={(value.staged_payments || []).length >= 3}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add stage
              </Button>
              <div
                className={`text-sm flex items-center gap-1 ${
                  Math.abs(stagedTotalPercent - 100) < 0.01
                    ? "text-green-700"
                    : "text-amber-700"
                }`}
              >
                {Math.abs(stagedTotalPercent - 100) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                Total: {stagedTotalPercent.toFixed(0)}%
                {Math.abs(stagedTotalPercent - 100) >= 0.01 && " (must equal 100%)"}
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT */}
        {value.payment_mode === "account" && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
            <Label className="text-xs">Payment terms</Label>
            <Select
              value={String(value.payment_terms_days || 14)}
              onValueChange={(v) =>
                onChange({ ...value, payment_terms_days: parseInt(v, 10) })
              }
            >
              <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground italic">
              Customer sees: "Invoice terms: {value.payment_terms_days || 14} days from
              completion."
            </p>
          </div>
        )}

        {value.payment_mode === "completion" && (
          <p className="text-xs text-muted-foreground italic">
            Customer sees: "Payment due on completion. Invoice will be sent on the day
            work finishes."
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ModeCard({
  id,
  current,
  label,
  hint,
}: {
  id: PaymentMode;
  current: PaymentMode;
  label: string;
  hint: string;
}) {
  const selected = current === id;
  return (
    <label
      className={`cursor-pointer rounded-md border p-3 flex items-start gap-2 transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <RadioGroupItem value={id} id={id} className="mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </label>
  );
}
