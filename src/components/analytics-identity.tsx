"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface AnalyticsIdentityProps {
  user: { id: string; name?: string | null; email?: string | null } | null;
}

export function AnalyticsIdentity({ user }: AnalyticsIdentityProps) {
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
      });

      window.op?.("identify", {
        profileId: user.id,
        ...(user.email && { email: user.email }),
        ...(user.name && { firstName: user.name }),
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
