"use client";

import { useEffect, useState } from "react";
import { useLiff } from "../providers/LiffProvider";

interface Profile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

function StateBlock({
  title,
  detail,
  tone = "muted",
}: {
  title: string;
  detail?: string;
  tone?: "muted" | "destructive";
}) {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <p
          className={`text-sm ${
            tone === "destructive" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {title}
        </p>
        {detail ? (
          <p className="mt-2 text-xs break-words text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  const { liffObject, liffError, isReady } = useLiff();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !liffObject) return;

    if (!liffObject.isLoggedIn()) {
      liffObject.login();
      return;
    }

    let cancelled = false;
    liffObject
      .getProfile()
      .then((userProfile) => {
        if (cancelled) return;
        setProfile({
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to get profile:", error);
        setProfileError(
          error instanceof Error ? error.message : String(error)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, liffObject]);

  if (liffError) {
    return <StateBlock title="LIFF init failed" detail={liffError} tone="destructive" />;
  }
  if (!isReady) return <StateBlock title="Loading LINE profile…" />;
  if (profileError) {
    return <StateBlock title="Profile error" detail={profileError} tone="destructive" />;
  }
  if (!profile) return <StateBlock title="Waiting for LINE login…" />;

  const initials = profile.displayName.slice(0, 2).toUpperCase();

  return (
    <main className="flex min-h-dvh w-full items-center justify-center p-6">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
        {profile.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.pictureUrl}
            alt={profile.displayName}
            width={96}
            height={96}
            className="size-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {initials}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {profile.displayName}
          </h1>
          <p className="text-xs text-muted-foreground">{profile.userId}</p>
        </div>

        <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          LINE connected
        </span>
      </section>
    </main>
  );
}
