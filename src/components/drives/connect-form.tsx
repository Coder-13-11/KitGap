"use client";

import { useState, useTransition } from "react";
import { connectFormWebhookAction, disableFormWebhookAction, saveWebhookQuestionsAction } from "@/actions/imports";
import { DEFAULT_WEBHOOK_QUESTIONS, type WebhookQuestions } from "@/domain/import";
import { Button } from "../ui/button";
import { CopyLink } from "../ui/copy-link";
import { inputClass } from "../ui/field";

function scriptFor(url: string) {
  return `function onFormSubmit(e) {
  var answers = {};
  var items = e.response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    answers[items[i].getItem().getTitle()] = String(items[i].getResponse());
  }
  UrlFetchApp.fetch(${JSON.stringify(url)}, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ responseId: e.response.getId(), answers: answers })
  });
}`;
}

export function ConnectForm({
  commitmentId,
  live,
  webhook,
}: {
  commitmentId: string;
  live: boolean;
  webhook: { connected: boolean; disabled: boolean; lastUsedAt: Date | null; questions: WebhookQuestions } | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState(webhook?.questions ?? DEFAULT_WEBHOOK_QUESTIONS);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const connected = Boolean(webhook?.connected && !webhook.disabled) || Boolean(url);

  const setField = (key: keyof WebhookQuestions, value: string | boolean) => {
    setQuestions((q) => ({ ...q, [key]: value }));
  };

  if (!live) {
    return (
      <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        Live Google Forms sync is for real drives. In this demo, use{" "}
        <a href="#import" className="font-semibold">
          Import sign-ups
        </a>{" "}
        with the sample file.
      </div>
    );
  }

  return (
    <section aria-labelledby="connect-title" className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 id="connect-title" className="font-semibold">
          Connect a Google Form
        </h2>
        <p className="mt-1 text-sm text-muted">
          Each new response becomes a pledge. You still record what actually arrives. KitGap never signs in to Google.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Question titles on your form</legend>
        {(
          [
            ["name", "Question for the person's name"],
            ["item", "Question for what they're bringing"],
            ["quantity", "Question for how many"],
            ["email", "Question for email (optional)"],
            ["comments", "Question for a note (optional)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">{label}</span>
            <input
              value={questions[key]}
              onChange={(e) => setField(key, e.target.value)}
              className={inputClass()}
            />
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={questions.keepEmails}
          onChange={(e) => setField("keepEmails", e.target.checked)}
          className="size-5 accent-forest"
        />
        Keep emails for coordinators only
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          pending={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await connectFormWebhookAction({ commitmentId, questions });
              if (result.ok) setUrl(result.data.url);
              else setError(result.message);
            })
          }
        >
          {connected ? "Rotate the link" : "Create the webhook link"}
        </Button>
        {connected ? (
          <Button
            variant="secondary"
            pending={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const result = await saveWebhookQuestionsAction({ commitmentId, questions });
                if (!result.ok) setError(result.message);
              })
            }
          >
            Save question titles
          </Button>
        ) : null}
        {webhook?.connected && !webhook.disabled ? (
          <Button
            variant="danger"
            pending={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const result = await disableFormWebhookAction({ commitmentId });
                if (result.ok) setUrl(null);
                else setError(result.message);
              })
            }
          >
            Turn it off
          </Button>
        ) : null}
      </div>

      {url ? (
        <div className="space-y-3 rounded-lg bg-paper p-4">
          <p className="text-sm font-semibold text-forest">Copy this now. KitGap stores only a hash, so we can't show the full link again.</p>
          <CopyLink url={url} label="Copy webhook link" />
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Open your Google Form, then the three dots, then Script editor.</li>
            <li>Paste the script below and save it.</li>
            <li>Triggers → Add trigger → choose onFormSubmit, event From form, On form submit.</li>
            <li>Authorize the script when Google asks. New responses land here as pledges.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">{scriptFor(url)}</pre>
        </div>
      ) : connected ? (
        <p className="text-sm text-muted">
          A form is connected{webhook?.lastUsedAt ? " and has received responses" : ""}. If you lost the link, rotate it and paste the new
          script.
        </p>
      ) : null}
    </section>
  );
}
