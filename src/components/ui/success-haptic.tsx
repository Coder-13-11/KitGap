"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/native";

// A success buzz in the native app when a confirmation lands. Nothing in a browser.
export function SuccessHaptic() {
  useEffect(() => {
    void haptic("success");
  }, []);
  return null;
}
