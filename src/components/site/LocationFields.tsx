import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Field } from "@/components/site/Field";
import { Input } from "@/components/ui/input";
import { placeName, useFt } from "@/core/formText";
import { useLang } from "@/core/i18n";
import { INDIAN_STATES } from "@/lib/locations";
import type { PinInfo } from "@/lib/pincode";

import { DistrictInput } from "./DistrictInput";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const pinCache = new Map<string, PinInfo | null>();
async function lookupPin(pin: string): Promise<PinInfo | null | "error"> {
  if (pinCache.has(pin)) return pinCache.get(pin) ?? null;
  try {
    const r = await fetch(`/api/public/pincode/${pin}`);
    if (r.status === 404) { pinCache.set(pin, null); return null; }
    if (!r.ok) return "error";
    const j = (await r.json()) as PinInfo & { ok: boolean };
    const v = j.ok ? j : null;
    pinCache.set(pin, v);
    return v;
  } catch { return "error"; }
}

/**
 * State / district / city inputs shared by every public form.
 * A PIN box comes first: 6 digits fill the state, the district (official spelling) and offer the post offices as the
 * town (saved as `pincode` only when the form has that field — `savePin`).
 * State is always a dropdown of all Indian states and union territories.
 * District is a type-ahead box with the districts of the chosen state (or all India; picking one fills the state).
 */
export function LocationFields({
  form,
  includeDistrict = true,
  includeCity = true,
  required,
  includePin = true,
  savePin = false,
}: {
  form: UseFormReturn<any>;
  includeDistrict?: boolean;
  includeCity?: boolean;
  required?: boolean;
  includePin?: boolean;
  /** Keep the PIN in the form as `pincode` (the table has that column). */
  savePin?: boolean;
}) {
  const { register, setValue, formState, getValues, watch } = form;
  const t = useFt();
  const hi = useLang().lang === "hi";
  const [state, setState] = useState<string>(() => (getValues("state") as string) ?? "");
  const stateReg = register("state", required ? { required: "Please select your state" } : {});
  register("district", includeDistrict && required ? { required: "Please enter your district" } : {});
  const errors = formState.errors as Record<string, { message?: string } | undefined>;
  const [pin, setPin] = useState<string>(() => (savePin ? String(getValues("pincode") ?? "") : ""));
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null);
  const [pinState, setPinState] = useState<"idle" | "busy" | "none" | "error">("idle");
  const lastPin = useRef("");
  if (savePin) register("pincode");

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pin) || pin === lastPin.current) return;
    lastPin.current = pin;
    let live = true;
    setPinState("busy");
    void lookupPin(pin).then((r) => {
      if (!live) return;
      if (r === "error") { setPinState("error"); return; }
      if (!r) { setPinInfo(null); setPinState("none"); return; }
      setPinInfo(r); setPinState("idle");
      if (r.state) { setState(r.state); setValue("state", r.state, { shouldDirty: true, shouldValidate: !!errors["state"] }); }
      if (includeDistrict && r.district) setValue("district", r.district, { shouldDirty: true, shouldValidate: !!errors["district"] });
      if (includeCity && !String(getValues("city") ?? "").trim() && r.places.length === 1) setValue("city", r.places[0]!.name, { shouldDirty: true });
    });
    return () => { live = false; };
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinHint = pinState === "busy" ? (hi ? "PIN से पता खोज रहे हैं…" : "Looking up the PIN…")
    : pinState === "none" ? (hi ? "यह PIN India Post की list में नहीं मिला — जाँच लें" : "This PIN isn't in India Post's list — please check")
    : pinState === "error" ? (hi ? "अभी PIN से नहीं भर पाए — बाकी खुद भर दें" : "Couldn't look up the PIN now — please fill the rest")
    : pinInfo ? `✓ ${[pinInfo.district, pinInfo.state].filter(Boolean).map((x) => placeName(x, hi)).join(", ")}`
    : (hi ? "PIN डालें — राज्य और ज़िला अपने-आप भर जाएँगे" : "Type the PIN — state and district fill in by themselves");

  return (
    <>
      {includePin ? (
        <Field label={hi ? "PIN कोड" : "PIN code"} hint={pinHint}>
          <Input
            inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="495452" value={pin} className="font-mono tracking-wider"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPin(v);
              if (savePin) setValue("pincode", v, { shouldDirty: true });
            }}
          />
          {includeCity && pinInfo && pinInfo.places.length > 1 ? (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {pinInfo.places.slice(0, 8).map((p) => (
                <button key={p.name} type="button" onClick={() => setValue("city", p.name, { shouldDirty: true })}
                  className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${watch("city") === p.name ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}>
                  {p.name}
                </button>
              ))}
            </span>
          ) : null}
        </Field>
      ) : null}

      <Field label="State" required={required} error={errors["state"]?.message}>
        <select
          className={selectClass}
          {...stateReg}
          onChange={(e) => {
            setState(e.target.value);
            void stateReg.onChange(e);
            setValue("state", e.target.value, { shouldDirty: true, shouldValidate: false });
            setValue("district", "");
          }}
        >
          <option value="">{t("Select state")}</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {placeName(s, hi)}
            </option>
          ))}
        </select>
      </Field>

      {includeDistrict ? (
        <Field
          label="District"
          required={required}
          error={errors["district"]?.message}
          hint={state ? "Type a few letters and pick from the list" : "Type a few letters — the state is filled in for you"}
        >
          <DistrictInput
            value={(watch("district") as string) ?? ""}
            state={state || null}
            hi={hi}
            invalid={!!errors["district"]}
            onChange={(v) => setValue("district", v, { shouldDirty: true, shouldValidate: !!errors["district"] })}
            onPick={(_d, st) => { if (!state) { setState(st); setValue("state", st, { shouldDirty: true }); } }}
          />
        </Field>
      ) : null}

      {includeCity ? (
        <Field label="City / town / village" required={required} error={errors["city"]?.message}>
          <Input {...register("city", required ? { required: "Please enter your city" } : {})} />
        </Field>
      ) : null}
    </>
  );
}
