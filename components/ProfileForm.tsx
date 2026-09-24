"use client";

import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import { flushSync } from "react-dom";
import { ProfilePreview } from "@/components/ProfilePreview";
import { putProfile } from "@/lib/profile-api";
import {
  FIELD_LABELS,
  LENGTH_LIMITS,
  validateProfile,
  type FieldErrors,
  type Profile,
  type ProfileField,
} from "@/lib/profile";

type FormValues = Record<ProfileField, string>;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; savedAtTime: string }
  | { status: "error"; message: string };

const FIELD_ORDER: ProfileField[] = ["displayName", "bio", "link.label", "link.url"];

const URL_HINT = "A full address starting with https://";

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [formValues, setFormValues] = useState(() => toFormValues(initialProfile));
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const isSaveInFlight = useRef(false);

  const draftProfile = toProfile(formValues);
  const clientValidation = validateProfile(draftProfile);
  const visibleFieldErrors: FieldErrors = {
    ...(clientValidation.ok ? {} : clientValidation.fieldErrors),
    ...serverFieldErrors,
  };
  const isSaving = saveState.status === "saving";

  function handleFieldChange(field: ProfileField, value: string) {
    setFormValues((previousValues) => ({ ...previousValues, [field]: value }));
    setServerFieldErrors((previousErrors) => withoutField(previousErrors, field));
    setSaveState({ status: "idle" });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaveInFlight.current) return;

    if (!clientValidation.ok) {
      setSaveState({
        status: "error",
        message: "Fix the highlighted fields, then save again.",
      });
      focusFirstInvalidField(clientValidation.fieldErrors);
      return;
    }

    isSaveInFlight.current = true;
    setSaveState({ status: "saving" });
    const saveResult = await putProfile(draftProfile);
    isSaveInFlight.current = false;

    if (saveResult.ok) {
      setFormValues(toFormValues(saveResult.profile));
      setServerFieldErrors({});
      setSaveState({ status: "saved", savedAtTime: new Date().toLocaleTimeString() });
      return;
    }

    flushSync(() => {
      setServerFieldErrors(saveResult.fieldErrors);
      setSaveState({
        status: "error",
        message: `Not saved. ${saveResult.message} Your changes are still in the form.`,
      });
    });
    focusFirstInvalidField(saveResult.fieldErrors);
  }

  return (
    <div className="grid items-start gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
      <form noValidate onSubmit={handleSubmit} className="comic-panel space-y-6 p-5 sm:p-7">
        {FIELD_ORDER.map((field) => (
          <ProfileFormField
            key={field}
            field={field}
            value={formValues[field]}
            error={visibleFieldErrors[field]}
            readOnly={isSaving}
            onChange={handleFieldChange}
          />
        ))}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <button type="submit" disabled={isSaving} className="comic-button">
            {isSaving ? "Saving..." : "Save"}
          </button>
          <SaveStatusMessage saveState={saveState} />
        </div>
      </form>

      <ProfilePreview profile={draftProfile} />
    </div>
  );
}

type ProfileFormFieldProps = {
  field: ProfileField;
  value: string;
  error?: string;
  readOnly: boolean;
  onChange: (field: ProfileField, value: string) => void;
};

function ProfileFormField({ field, value, error, readOnly, onChange }: ProfileFormFieldProps) {
  const lengthLimit = field === "link.url" ? undefined : LENGTH_LIMITS[field];
  const hint = field === "link.url" ? URL_HINT : undefined;
  const trimmedLength = value.trim().length;
  const inputId = inputIdFor(field);
  const hintId = `${inputId}-hint`;
  const counterId = `${inputId}-count`;
  const errorId = `${inputId}-error`;
  const describedByIds = [hint && hintId, lengthLimit && counterId, error && errorId]
    .filter(Boolean)
    .join(" ");

  const sharedControlProps = {
    id: inputId,
    value,
    readOnly,
    required: lengthLimit ? lengthLimit.min > 0 : true,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedByIds || undefined,
    className: "comic-input",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value),
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <label htmlFor={inputId} className="comic-label">
          {FIELD_LABELS[field]}
          {lengthLimit?.min === 0 && <span className="optional-marker"> (optional)</span>}
        </label>
        {lengthLimit && (
          <span
            id={counterId}
            className="length-counter"
            data-over-limit={trimmedLength > lengthLimit.max}
          >
            {trimmedLength}/{lengthLimit.max}
            <span className="sr-only"> characters</span>
          </span>
        )}
      </div>

      {field === "bio" ? (
        <textarea rows={3} {...sharedControlProps} />
      ) : (
        <input type={field === "link.url" ? "url" : "text"} {...sharedControlProps} />
      )}

      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function SaveStatusMessage({ saveState }: { saveState: SaveState }) {
  return (
    <>
      <p role="status" className="save-status">
        {saveState.status === "saving" && <span className="sr-only">Saving...</span>}
        {saveState.status === "saved" && (
          <span className="save-status-success">Saved at {saveState.savedAtTime}.</span>
        )}
      </p>
      {saveState.status === "error" && (
        <p role="alert" className="save-status-error">
          {saveState.message}
        </p>
      )}
    </>
  );
}

function toFormValues(profile: Profile): FormValues {
  return {
    displayName: profile.displayName,
    bio: profile.bio,
    "link.label": profile.link.label,
    "link.url": profile.link.url,
  };
}

function toProfile(formValues: FormValues): Profile {
  return {
    displayName: formValues.displayName,
    bio: formValues.bio,
    link: { label: formValues["link.label"], url: formValues["link.url"] },
  };
}

function withoutField(fieldErrors: FieldErrors, field: ProfileField): FieldErrors {
  const remainingErrors = { ...fieldErrors };
  delete remainingErrors[field];
  return remainingErrors;
}

function inputIdFor(field: ProfileField): string {
  return field.replace(".", "-");
}

function focusFirstInvalidField(fieldErrors: FieldErrors) {
  const firstInvalidField = FIELD_ORDER.find((field) => fieldErrors[field]);
  if (firstInvalidField) {
    document.getElementById(inputIdFor(firstInvalidField))?.focus();
  }
}
