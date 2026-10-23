"use client";

import { useEffect } from "react";
import { markUpdatesSeenAction } from "@/actions/app";

// Opening the Updates page marks everything on it as read.
export function MarkUpdatesSeen() {
  useEffect(() => {
    void markUpdatesSeenAction();
  }, []);
  return null;
}
