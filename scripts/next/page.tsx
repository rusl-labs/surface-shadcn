"use client";

import { useState } from "react";
import { Surface, SurfaceProvider } from "@/components/surface";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import contactSchema from "./contact.schema.json";

const initial = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+14155550100",
  budget: { amount: 3423, currency: "USD" },
  relationship: "Partner",
  updates: true,
  location: { city: "Melbourne", timezone: "Australia/Sydney" },
  tags: ["Design partner"],
  notes: "Working together on the next good thing.",
};

export default function Page() {
  const [draft, setDraft] = useState<unknown>(initial);
  const [saved, setSaved] = useState<unknown>(initial);
  const [saves, setSaves] = useState(0);
  const [locale, setLocale] = useState("en-US");
  const [sample, setSample] = useState("us");

  function loadSample(value: string) {
    setSample(value);
    if (value === "defaults") {
      const { phone: _phone, budget: _budget, ...contact } = initial;
      setDraft(contact);
    } else {
      setDraft({
        ...initial,
        ...(value === "jp"
          ? {
              phone: "+81312345678",
              budget: { amount: 3400, currency: "JPY" },
            }
          : {}),
      });
    }
  }

  return (
    <SurfaceProvider locale={locale} defaultCountry="AU" defaultCurrency="AUD">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Surface / installed consumer
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            One install. A working Surface.
          </h1>
          <p className="text-muted-foreground">
            This is the focused installation fixture, not the schema playground.
            It imports its generated Surface without workspace links.
          </p>
          <a
            className="underline underline-offset-4"
            href="http://localhost:3100/"
          >
            Open the full schema and annotation playground
          </a>
          <div className="flex flex-wrap gap-4 pt-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="sample">Load sample</label>
              <Select
                value={sample}
                onValueChange={(value) => {
                  if (value) loadSample(value);
                }}
              >
                <SelectTrigger id="sample">
                  <SelectValue>
                    {sample === "us"
                      ? "US phone / US dollars"
                      : sample === "jp"
                        ? "Japanese phone / yen"
                        : "No values / application defaults"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="us">US phone / US dollars</SelectItem>
                    <SelectItem value="jp">Japanese phone / yen</SelectItem>
                    <SelectItem value="defaults">
                      No values / application defaults
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="locale">Formatting locale</label>
              <Select
                value={locale}
                onValueChange={(value) => {
                  if (value) setLocale(value);
                }}
              >
                <SelectTrigger id="locale">
                  <SelectValue>{locale}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {["en-US", "de-DE", "en-AU"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>
        <div className="grid items-start gap-8 md:grid-cols-2">
          <section
            className="flex min-w-0 flex-col gap-6 rounded-xl border p-6"
            aria-label="Input surface"
          >
            <h2 className="text-xl font-semibold">Edit a contact</h2>
            <Surface
              id={contactSchema.$id}
              schema={contactSchema}
              mode="input"
              view="default"
              data={draft}
              onChange={setDraft}
              onSubmit={({ data }) => {
                setSaved(data);
                setSaves((count) => count + 1);
              }}
            />
          </section>
          <section
            className="flex min-w-0 flex-col gap-6 rounded-xl border p-6"
            aria-label="Display surface"
          >
            <h2 className="text-xl font-semibold">Live display</h2>
            <Surface
              id={contactSchema.$id}
              schema={contactSchema}
              mode="display"
              view="card"
              data={draft}
            />
          </section>
        </div>
        <section
          className="flex flex-col gap-3 rounded-xl border p-6"
          aria-label="Saved record"
        >
          <h2 className="text-xl font-semibold">Saved JSON</h2>
          <p role="status">{saves} successful saves</p>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(saved, null, 2)}
          </pre>
        </section>
        <p className="text-sm text-muted-foreground">
          Edit the phone and budget, then try an incomplete value before Save.
          The provider defaults to AU/AUD; existing US/USD values take
          precedence. Input uses the default annotated view; display uses card.
          Save validates the whole contact; Reset restores the initial record.
          Supported canonical schemas are bundled locally; this page works
          offline.
        </p>
      </main>
    </SurfaceProvider>
  );
}
