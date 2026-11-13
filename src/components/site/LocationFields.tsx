import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Field } from "@/components/site/Field";
import { Input } from "@/components/ui/input";
import { placeName, useFt } from "@/core/formText";
import { useLang } from "@/core/i18n";
import { INDIAN_STATES } from "@/lib/locations";

import { DistrictInput } from "./DistrictInput";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/**
 * State / district / city inputs shared by every public form.
 * State is always a dropdown of all Indian states and union territories.
 * District is a type-ahead box with the districts of the chosen state (or all India; picking one fills the state).
 */
export function LocationFields({
  form,
  includeDistrict = true,
  includeCity = true,
  required,
}: {
  form: UseFormReturn<any>;
  includeDistrict?: boolean;
  includeCity?: boolean;
  required?: boolean;
}) {
  const { register, setValue, formState, getValues, watch } = form;
  const t = useFt();
  const hi = useLang().lang === "hi";
  const [state, setState] = useState<string>(() => (getValues("state") as string) ?? "");
  const stateReg = register("state", required ? { required: "Please select your state" } : {});
  register("district", includeDistrict && required ? { required: "Please enter your district" } : {});
  const errors = formState.errors as Record<string, { message?: string } | undefined>;

  return (
    <>
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
