"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Check, Smartphone } from "lucide-react";
import { saveExternalSignupAction } from "@/actions/discover";
import { ActionForm } from "../ui/action-form";
import { AppLink, useBase, withBase } from "../ui/base";
import { SubmitButton } from "../ui/button";
import { inputClass } from "../ui/field";

const DEVICE_KEY = "kitgap.joined";

export interface DeviceJoined {
  url: string;
  title: string;
  plan: string;
  at: string;
}

export function readDeviceJoined(): DeviceJoined[] {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "[]") as DeviceJoined[];
  } catch {
    return [];
  }
}

const PLAN_IDEAS = ["2 backpacks", "A bag of canned food", "10 pencil packs", "A shift volunteering"];

export function JoinedForm({ url, title, signedIn }: { url: string; title: string; signedIn: boolean }) {
  const router = useRouter();
  const base = useBase();
  const [plan, setPlan] = useState("");
  const [savedOnDevice, setSavedOnDevice] = useState(false);

  const planField = (id: string, error?: string) => (
    <div className="space-y-2">
      <label htmlFor={id} className="text-lg font-semibold">
        What will you bring? <span className="font-normal text-muted">(optional)</span>
      </label>
      <input
        id={id}
        name="plan"
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        maxLength={300}
        placeholder="For example, 2 backpacks and 10 notebooks"
        className={inputClass(error, "min-h-12 text-base")}
        aria-describedby={`${id}-ideas`}
      />
      <div id={`${id}-ideas`} className="flex flex-wrap gap-2">
        {PLAN_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => setPlan(idea)}
            className="press min-h-9 rounded-full border border-line-strong px-3 text-sm font-medium hover:border-forest hover:bg-forest-tint"
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );

  if (signedIn) {
    return (
      <ActionForm
        action={saveExternalSignupAction}
        hidden={{ url, title }}
        resetOnSuccess={false}
        onSuccess={() => router.push(withBase(base, "/drives?saved=1#elsewhere"))}
        className="space-y-5"
      >
        {(errors, idFor) => (
          <>
            {planField(idFor("plan"), errors.plan)}
            <SubmitButton className="w-full min-h-12 text-lg">
              <Check className="size-5" aria-hidden="true" />
              Save to My drives
            </SubmitButton>
            <CountHint />
          </>
        )}
      </ActionForm>
    );
  }

  if (savedOnDevice) {
    return (
      <div className="appear space-y-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-forest-tint px-4 py-2 font-semibold text-forest">
          <Smartphone className="size-4" aria-hidden="true" />
          Saved on this device
        </p>
        <p className="text-muted">Create a free account to keep it on every device and track what you give.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <AppLink
            href="/sign-up?next=/drives"
            className="press inline-flex min-h-12 items-center rounded-lg bg-forest px-5 font-semibold text-white no-underline hover:bg-forest-dark"
          >
            Create an account
          </AppLink>
          <AppLink href="/discover" className="press inline-flex min-h-12 items-center rounded-lg border border-line-strong px-5 font-semibold no-underline hover:bg-sunken">
            Find another drive
          </AppLink>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const list = readDeviceJoined().filter((j) => j.url !== url);
        list.unshift({ url, title, plan: plan.trim().slice(0, 300), at: new Date().toISOString() });
        localStorage.setItem(DEVICE_KEY, JSON.stringify(list.slice(0, 50)));
        setSavedOnDevice(true);
      }}
    >
      {planField("plan-device")}
      <button type="submit" className="press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest text-lg font-semibold text-white hover:bg-forest-dark">
        <Check className="size-5" aria-hidden="true" />
        Save it
      </button>
      <p className="text-center text-sm text-muted">
        Have an account?{" "}
        <AppLink href={`/sign-in?next=${encodeURIComponent(`/discover/joined?${new URLSearchParams({ url, title }).toString()}`)}`}>Sign in</AppLink> to save it there instead.
      </p>
      <CountHint />
    </form>
  );
}

function CountHint() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
      <Camera className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden="true" />
      <span>
        Collecting a lot? <AppLink href="/tools">Count it with a photo</AppLink> before you drop it off.
      </span>
    </p>
  );
}
