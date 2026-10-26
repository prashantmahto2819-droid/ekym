import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Field } from "@/components/site/Field";
import { Input } from "@/components/ui/input";
import { CHHATTISGARH, INDIAN_STATES, districtsForState } from "@/lib/locations";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/**
 * State / district / city inputs shared by every public form.
 * State is always a dropdown of all Indian states and union territories.
 * District becomes a dropdown of Chhattisgarh districts when Chhattisgarh is chosen.
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
  const { register, setValue, formState, getValues } = form;
  const [state, setState] = useState<string>(() => (getValues("state") as string) ?? "");
  const districts = districtsForState(state);
  const stateReg = register("state", required ? { required: "Please select your state" } : {});
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
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      {includeDistrict ? (
        <Field
          label="District"
          required={required}
          error={errors["district"]?.message}
          {...(state === CHHATTISGARH ? {} : { hint: "Type your district name" })}
        >
          {districts.length ? (
            <select
              className={selectClass}
              {...register("district", required ? { required: "Please select your district" } : {})}
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <Input
              {...register("district", required ? { required: "Please enter your district" } : {})}
            />
          )}
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
