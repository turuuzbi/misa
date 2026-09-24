import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const PROFILE_ENDPOINT = new URL(
  "/api/profile",
  process.env.BASE_URL ?? "http://localhost:3000",
);

const VALID_PROFILE = {
  displayName: "Nova",
  bio: "Music, late nights, and things I make.",
  link: { label: "My website", url: "https://example.com" },
};

async function fetchStoredProfile() {
  const response = await fetch(PROFILE_ENDPOINT);
  assert.equal(response.status, 200);
  return response.json();
}

async function putRawBody(rawBody) {
  const response = await fetch(PROFILE_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
  return { status: response.status, body: await response.json() };
}

const putJsonBody = (value) => putRawBody(JSON.stringify(value));

const validProfileWith = (fields) => ({ ...VALID_PROFILE, ...fields });

const validProfileWithLink = (linkFields) => ({
  ...VALID_PROFILE,
  link: { ...VALID_PROFILE.link, ...linkFields },
});

function validProfileWithout(fieldName) {
  const profile = structuredClone(VALID_PROFILE);
  delete profile[fieldName];
  return profile;
}

let profileBeforeTests;

before(async () => {
  profileBeforeTests = await fetchStoredProfile();
});

after(async () => {
  await putJsonBody(profileBeforeTests);
});

test("GET returns a profile with four string values", async () => {
  const profile = await fetchStoredProfile();
  assert.equal(typeof profile.displayName, "string");
  assert.equal(typeof profile.bio, "string");
  assert.equal(typeof profile.link.label, "string");
  assert.equal(typeof profile.link.url, "string");
});

test("PUT trims values, accepts maximum lengths, and GET returns the saved profile", async () => {
  const response = await putJsonBody({
    displayName: `  ${"n".repeat(40)}  `,
    bio: `\n${"b".repeat(160)}\n`,
    link: { label: ` ${"l".repeat(30)} `, url: "  https://example.org/path  " },
  });
  const expectedProfile = {
    displayName: "n".repeat(40),
    bio: "b".repeat(160),
    link: { label: "l".repeat(30), url: "https://example.org/path" },
  };
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, expectedProfile);
  assert.deepEqual(await fetchStoredProfile(), expectedProfile);
});

test("PUT accepts an empty bio", async () => {
  const response = await putJsonBody(validProfileWith({ bio: "   " }));
  assert.equal(response.status, 200);
  assert.equal(response.body.bio, "");
});

test("PUT ignores unknown fields instead of storing them", async () => {
  const response = await putJsonBody({
    ...validProfileWithLink({ extra: 1 }),
    isAdmin: true,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, VALID_PROFILE);
  assert.deepEqual(await fetchStoredProfile(), VALID_PROFILE);
});

test("malformed JSON gets 400 invalid_json and the profile is unchanged", async () => {
  const profileBeforeRequest = await fetchStoredProfile();
  const response = await putRawBody('{"displayName": "Nova",');
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_json");
  assert.equal(typeof response.body.message, "string");
  assert.deepEqual(await fetchStoredProfile(), profileBeforeRequest);
});

const INVALID_REQUEST_CASES = [
  ["missing displayName", validProfileWithout("displayName"), "displayName"],
  ["displayName that is not a string", validProfileWith({ displayName: 42 }), "displayName"],
  ["whitespace-only displayName", validProfileWith({ displayName: "   " }), "displayName"],
  ["displayName of 41 characters", validProfileWith({ displayName: "n".repeat(41) }), "displayName"],
  ["missing bio", validProfileWithout("bio"), "bio"],
  ["bio of 161 characters", validProfileWith({ bio: "b".repeat(161) }), "bio"],
  ["missing link", validProfileWithout("link"), "link.url"],
  ["empty link label", validProfileWithLink({ label: " " }), "link.label"],
  ["link label of 31 characters", validProfileWithLink({ label: "l".repeat(31) }), "link.label"],
  ["null link label", validProfileWithLink({ label: null }), "link.label"],
  ["http: URL", validProfileWithLink({ url: "http://example.com" }), "link.url"],
  ["javascript: URL", validProfileWithLink({ url: "javascript:alert(1)" }), "link.url"],
  ["data: URL", validProfileWithLink({ url: "data:text/html,<p>hi</p>" }), "link.url"],
  ["https URL without a hostname", validProfileWithLink({ url: "https://" }), "link.url"],
  ["https URL without slashes", validProfileWithLink({ url: "https:example.com" }), "link.url"],
  ["relative URL", validProfileWithLink({ url: "/about" }), "link.url"],
  ["URL that is not a string", validProfileWithLink({ url: ["https://example.com"] }), "link.url"],
  ["null body", null, "displayName"],
  ["array body", [VALID_PROFILE], "displayName"],
];

for (const [caseName, requestBody, expectedErrorField] of INVALID_REQUEST_CASES) {
  test(`rejects ${caseName} with 400 and leaves the profile unchanged`, async () => {
    const profileBeforeRequest = await fetchStoredProfile();
    const response = await putJsonBody(requestBody);
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "validation_failed");
    assert.equal(typeof response.body.fieldErrors?.[expectedErrorField], "string");
    assert.deepEqual(await fetchStoredProfile(), profileBeforeRequest);
  });
}
