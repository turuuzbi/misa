import { hasProfileShape, type FieldErrors, type Profile } from "./profile";

export type ProfileRequestResult =
  | { ok: true; profile: Profile }
  | { ok: false; message: string; fieldErrors: FieldErrors };

const PROFILE_ENDPOINT = "/api/profile";
const REQUEST_TIMEOUT_MS = 10_000;

export function getProfile(): Promise<ProfileRequestResult> {
  return sendProfileRequest({ method: "GET" });
}

export function putProfile(profile: Profile): Promise<ProfileRequestResult> {
  return sendProfileRequest({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

async function sendProfileRequest(init: RequestInit): Promise<ProfileRequestResult> {
  let response: Response;
  try {
    response = await fetch(PROFILE_ENDPOINT, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return failedResult(
      isTimeoutError(error)
        ? "The server took too long to respond."
        : "Couldn't reach the server. Check your connection and try again.",
    );
  }

  const responseBody: unknown = await response.json().catch(() => null);
  if (response.ok && hasProfileShape(responseBody)) {
    return { ok: true, profile: responseBody };
  }
  if (isApiErrorBody(responseBody)) {
    return failedResult(responseBody.message, responseBody.fieldErrors);
  }
  return failedResult(
    `The server sent an unexpected response (HTTP ${response.status}).`,
  );
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function failedResult(message: string, fieldErrors: FieldErrors = {}): ProfileRequestResult {
  return { ok: false, message, fieldErrors };
}

function isApiErrorBody(
  value: unknown,
): value is { message: string; fieldErrors?: FieldErrors } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { message?: unknown }).message === "string"
  );
}
