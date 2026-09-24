import { validateProfile, type ApiErrorBody } from "@/lib/profile";
import { readProfile, writeProfile } from "@/lib/profile-store";

export const dynamic = "force-dynamic";

const NEVER_CACHE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  return Response.json(readProfile(), { headers: NEVER_CACHE_HEADERS });
}

export async function PUT(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(await request.text());
  } catch {
    return badRequest({
      error: "invalid_json",
      message: "Request body must be valid JSON.",
    });
  }

  const validation = validateProfile(requestBody);
  if (!validation.ok) {
    return badRequest({
      error: "validation_failed",
      message: "Some profile fields are invalid.",
      fieldErrors: validation.fieldErrors,
    });
  }

  const savedProfile = writeProfile(validation.profile);
  return Response.json(savedProfile, { headers: NEVER_CACHE_HEADERS });
}

function badRequest(body: ApiErrorBody) {
  return Response.json(body, { status: 400, headers: NEVER_CACHE_HEADERS });
}
