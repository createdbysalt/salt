"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/_lib/supabase/client";
import config from "@/config";

type Props = {
  /** Label shown to signed-out visitors. */
  text?: string;
  /** Extra Tailwind classes merged onto the link. */
  extraStyle?: string;
};

/**
 * Marketing-site sign-in link. Signed-out visitors see a call to action that
 * goes to the sign-in page; signed-in users see their avatar and name linking
 * straight into the app.
 */
export default function ButtonSignin({ text = "Get started", extraStyle = "" }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const className = `btn ${extraStyle}`.trim();

  if (!user) {
    return (
      <Link href={config.auth.loginUrl} className={className}>
        {text}
      </Link>
    );
  }

  const name: string | undefined = user.user_metadata?.name;
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url;
  const label = name || user.email || "Account";
  const initial = (name || user.email || "?").charAt(0).toUpperCase();

  return (
    <Link href={config.auth.callbackUrl} className={className} title="Open the app">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={24}
          height={24}
          referrerPolicy="no-referrer"
          className="h-6 w-6 shrink-0 rounded-full"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
        >
          {initial}
        </span>
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
