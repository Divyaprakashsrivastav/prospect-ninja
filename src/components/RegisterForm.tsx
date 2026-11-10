"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, TextInput } from "@/components/Field";
import styles from "./AuthForm.module.css";

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) =>
      registerAction(formData),
    undefined,
  );

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.sub}>Start with a demo LinkedIn provider. No scraping.</p>
        {state?.error ? <p className={styles.error}>{state.error}</p> : null}
        <form action={action}>
          <Field label="Name">
            <TextInput name="name" required minLength={2} />
          </Field>
          <Field label="Email">
            <TextInput name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <TextInput
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" block disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className={styles.footer}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
