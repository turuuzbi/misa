export type Profile = {
  displayName: string;
  bio: string;
  link: { label: string; url: string };
};

export type ProfileField = "displayName" | "bio" | "link.label" | "link.url";

export type LengthLimitedField = Exclude<ProfileField, "link.url">;

export type FieldErrors = Partial<Record<ProfileField, string>>;

export type ApiErrorBody = {
  error: "invalid_json" | "validation_failed";
  message: string;
  fieldErrors?: FieldErrors;
};

export type ProfileValidationResult =
  | { ok: true; profile: Profile }
  | { ok: false; fieldErrors: FieldErrors };

export const FIELD_LABELS: Record<ProfileField, string> = {
  displayName: "Display name",
  bio: "Bio",
  "link.label": "Link label",
  "link.url": "Link URL",
};

export const LENGTH_LIMITS: Record<LengthLimitedField, { min: number; max: number }> = {
  displayName: { min: 1, max: 40 },
  bio: { min: 0, max: 160 },
  "link.label": { min: 1, max: 30 },
};

const STARTS_WITH_HTTPS_SCHEME = /^https:\/\//i;

export function isValidHttpsUrl(value: string): boolean {
  if (!STARTS_WITH_HTTPS_SCHEME.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "";
  } catch {
    return false;
  }
}

export function validateProfile(input: unknown): ProfileValidationResult {
  const candidate = asObjectOrEmpty(input);
  const candidateLink = asObjectOrEmpty(candidate.link);

  const displayName = validateLengthLimitedField("displayName", candidate.displayName);
  const bio = validateLengthLimitedField("bio", candidate.bio);
  const linkLabel = validateLengthLimitedField("link.label", candidateLink.label);
  const linkUrl = validateLinkUrl(candidateLink.url);

  if (displayName.ok && bio.ok && linkLabel.ok && linkUrl.ok) {
    return {
      ok: true,
      profile: {
        displayName: displayName.value,
        bio: bio.value,
        link: { label: linkLabel.value, url: linkUrl.value },
      },
    };
  }

  const fieldErrors: FieldErrors = {};
  if (!displayName.ok) fieldErrors.displayName = displayName.error;
  if (!bio.ok) fieldErrors.bio = bio.error;
  if (!linkLabel.ok) fieldErrors["link.label"] = linkLabel.error;
  if (!linkUrl.ok) fieldErrors["link.url"] = linkUrl.error;
  return { ok: false, fieldErrors };
}

export function hasProfileShape(value: unknown): value is Profile {
  const candidate = asObjectOrEmpty(value);
  const candidateLink = asObjectOrEmpty(candidate.link);
  return (
    typeof candidate.displayName === "string" &&
    typeof candidate.bio === "string" &&
    typeof candidateLink.label === "string" &&
    typeof candidateLink.url === "string"
  );
}

type FieldValidation = { ok: true; value: string } | { ok: false; error: string };

function readTrimmedString(field: ProfileField, value: unknown): FieldValidation {
  const fieldLabel = FIELD_LABELS[field];
  if (value === undefined) {
    return { ok: false, error: `${fieldLabel} is required.` };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldLabel} must be a string.` };
  }
  return { ok: true, value: value.trim() };
}

function validateLengthLimitedField(
  field: LengthLimitedField,
  value: unknown,
): FieldValidation {
  const trimmed = readTrimmedString(field, value);
  if (!trimmed.ok) return trimmed;

  const fieldLabel = FIELD_LABELS[field];
  const { min, max } = LENGTH_LIMITS[field];
  if (trimmed.value.length < min) {
    const error =
      min === 1
        ? `${fieldLabel} can't be empty.`
        : `${fieldLabel} must be at least ${min} characters.`;
    return { ok: false, error };
  }
  if (trimmed.value.length > max) {
    return { ok: false, error: `${fieldLabel} must be ${max} characters or fewer.` };
  }
  return trimmed;
}

function validateLinkUrl(value: unknown): FieldValidation {
  const trimmed = readTrimmedString("link.url", value);
  if (!trimmed.ok) return trimmed;
  if (!isValidHttpsUrl(trimmed.value)) {
    return {
      ok: false,
      error: "Link URL must be a full https:// address, like https://example.com.",
    };
  }
  return trimmed;
}

function asObjectOrEmpty(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
