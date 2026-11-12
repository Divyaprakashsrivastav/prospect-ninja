"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

export function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="secondary" onClick={copy}>
      {copied ? "Copied" : "Copy message"}
    </Button>
  );
}
