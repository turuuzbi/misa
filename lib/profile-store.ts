import type { Profile } from "./profile";

const STARTING_PROFILE: Profile = {
  displayName: "Nova",
  bio: "Music, late nights, and things I make.",
  link: { label: "My website", url: "https://example.com" },
};

const hotReloadSafeMemory = globalThis as typeof globalThis & {
  savedProfile?: Profile;
};

export function readProfile(): Profile {
  hotReloadSafeMemory.savedProfile ??= structuredClone(STARTING_PROFILE);
  return structuredClone(hotReloadSafeMemory.savedProfile);
}

export function writeProfile(profile: Profile): Profile {
  hotReloadSafeMemory.savedProfile = structuredClone(profile);
  return readProfile();
}
