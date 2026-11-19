"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, TextInput } from "@/components/Field";
import styles from "./AuthForm.module.css";

export function LoginForm({
  configError,
  callbackUrl,
}: {
  configError?: string;
  callbackUrl?: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) =>
      loginAction(formData),
    undefined,
  );

  const error = state?.error ?? configError;

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <p className={styles.brand}>Prospect Ninja</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>
          AI prospecting with human-approved LinkedIn outreach.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <form action={action}>
          {callbackUrl ? (
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
          ) : null}
          <Field label="Email">
            <TextInput name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <TextInput
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" block disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className={styles.footer}>
          No account? <Link href="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
