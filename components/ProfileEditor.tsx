"use client";

import { useEffect, useState } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { getProfile } from "@/lib/profile-api";
import type { Profile } from "@/lib/profile";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: Profile };

export function ProfileEditor() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let responseIsStale = false;
    getProfile().then((result) => {
      if (responseIsStale) return;
      setLoadState(
        result.ok
          ? { status: "ready", profile: result.profile }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      responseIsStale = true;
    };
  }, [loadAttempt]);

  function retryLoad() {
    setLoadState({ status: "loading" });
    setLoadAttempt((attempt) => attempt + 1);
  }

  if (loadState.status === "loading") {
    return (
      <p role="status" className="narration-box inline-block">
        Loading profile...
      </p>
    );
  }

  if (loadState.status === "error") {
    return (
      <div role="alert" className="comic-panel p-5 sm:p-6">
        <p className="comic-label text-alarm-red">Couldn&apos;t load the profile.</p>
        <p className="mt-1 font-semibold">{loadState.message}</p>
        <button type="button" onClick={retryLoad} className="comic-button mt-5">
          Try again
        </button>
      </div>
    );
  }

  return <ProfileForm initialProfile={loadState.profile} />;
}
