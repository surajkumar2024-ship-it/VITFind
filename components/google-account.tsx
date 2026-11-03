"use client";
import { useState } from "react";
import { LoaderCircle, LogIn, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { resetVision } from "@/lib/vision-client";

export function GoogleSignIn({ ready = true }: { ready?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signIn() {
    setBusy(true); setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google", callbackURL: "/", errorCallbackURL: "/?auth_error=1",
      });
      if (result.error) throw Error("Google sign-in could not start. Please try again.");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <div className="google-account">
    <button className="primary full" type="button" disabled={!ready || busy} onClick={() => void signIn()}>
      {busy ? <LoaderCircle className="spin" size={18}/> : <LogIn size={18}/>}
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
    {!ready && <p className="profile-error" role="status">Google sign-in is awaiting setup by the site owner.</p>}
    {error && <p className="profile-error" role="alert">{error}</p>}
  </div>;
}

export function LocalDemoSignIn() {
  const [account, setAccount] = useState("student");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signIn() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local-session", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signin", account }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw Error(result.error || "Local login failed. Please try again.");
      resetVision();
      window.location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <form className="local-login" onSubmit={e => { e.preventDefault(); void signIn(); }}>
    <label className="field">Demo account
      <select aria-label="Demo account" value={account} disabled={busy} onChange={e => setAccount(e.target.value)}>
        <option value="student">Demo Student</option><option value="second">Second Student</option>
      </select>
    </label>
    <button className="primary full" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={18}/> : <LogIn size={18}/>}
      {busy ? "Opening VITFind…" : "Enter local app"}
    </button>
    {error && <p className="profile-error" role="alert">{error}</p>}
  </form>;
}

export function GoogleSignOut({ disabled = false, localDemo = false }: { disabled?: boolean; localDemo?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      if (localDemo) {
        const response = await fetch("/api/local-session", { method: "POST",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout" }) });
        if (!response.ok) throw Error("Log out failed. Please try again.");
      } else {
        const result = await authClient.signOut();
        if (result.error) throw Error("Log out failed. Please try again.");
      }
      resetVision();
      window.location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <div><button className="signout-link" type="button" disabled={disabled || busy} onClick={() => void signOut()}>
    {busy ? <LoaderCircle className="spin" size={17}/> : <LogOut size={17}/>} {busy ? "Logging out…" : "Log out"}
  </button>{error && <p className="profile-error" role="alert">{error}</p>}</div>;
}
