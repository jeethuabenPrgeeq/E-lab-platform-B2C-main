"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LockKeyhole } from "lucide-react";
import { changePasswordRequest, logoutRequest } from "@/features/auth/api";
import { clearSession, markPasswordChanged, readSession } from "@/features/auth/session";
import styles from "../login/login.module.css";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!readSession()) router.replace("/login");
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (next.length < 10) return setError("Use at least 10 characters for the new password.");
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return setError("Use at least one letter and one number in the new password.");
    if (next !== confirm) return setError("The new passwords don’t match.");
    setSaving(true);
    try {
      await changePasswordRequest(current, next);
      markPasswordChanged();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logoutRequest();
    clearSession();
    router.replace("/login");
  };

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, autoComplete: string) => (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputShell}>
        <LockKeyhole size={18} className={styles.inputIcon} />
        <input id={id} type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className={styles.input} required />
      </div>
    </div>
  );

  return (
    <main className={styles.page}>
      <section className={styles.formPanel}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <KeyRound size={26} />
          </div>
          <h2 className={styles.title}>Set your password</h2>
          <p className={styles.subtitle}>You signed in with a temporary password. Choose your own to continue.</p>
          <form onSubmit={submit} className={styles.form}>
            {field("current-password", "Temporary password", current, setCurrent, "current-password")}
            {field("new-password", "New password", next, setNext, "new-password")}
            {field("confirm-password", "Confirm new password", confirm, setConfirm, "new-password")}
            <p className={styles.subtitle}>At least 10 characters, with a letter and a number.</p>
            {error && (
              <div role="alert" className={styles.error}>
                {error}
              </div>
            )}
            <button type="submit" disabled={saving} className={styles.signInButton}>
              {saving ? "Saving…" : "Save and continue"}
              <ArrowRight size={18} />
            </button>
            <button type="button" className={styles.forgot} onClick={() => void signOut()}>
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}