"use client";

import { useEffect } from "react";

/** Share links made before the app moved to /app point at /#c=…. The fragment never reaches the
 *  server, so the landing page sends them on to the app here, where the shared character opens. */
export function ShareLinkForward() {
  useEffect(() => {
    if (/[#&]c=/.test(location.hash)) location.replace(`/app${location.hash}`);
  }, []);
  return null;
}
