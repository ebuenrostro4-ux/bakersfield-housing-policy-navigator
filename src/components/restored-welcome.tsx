"use client";
import { useState, type FormEvent } from "react";
import { ShieldCheck, Loader2, ArrowRight, ArrowUpRight } from "lucide-react";
import { Brand, Badge, Field } from "./ui";
export default function RestoredWelcome({
  demoMode,
  error,
  onLogin,
}: {
  demoMode: boolean;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState("");
  async function login(e?: FormEvent, account?: string) {
    e?.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      await onLogin(account || email, account ? "" : password);
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div>
          <div className="eyebrow light">CLARITY. COORDINATION. PROGRESS.</div>
          <h1>
            Housing policy.
            <br />A clearer path
            <br />
            <em>to action.</em>
          </h1>
          <p>
            A shared workspace to understand changing policy, connect the
            evidence, and move implementation forward.
          </p>
          <div className="login-pill">
            <ShieldCheck size={18} />
            Built around staff judgment
          </div>
        </div>
        <span className="login-foot">
          CITY OF BAKERSFIELD · STUDENT PROOF OF CONCEPT
        </span>
        <Skyline />
      </section>
      <section className="login-form">
        <div className="login-box">
          <Badge tone="green">Student demonstration workspace</Badge>
          <h2>Welcome to Navigator</h2>
          <p className="muted">Sign in to your housing policy workspace.</p>
          <form onSubmit={login}>
            <Field label="Employee email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="Your authorized email"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>
            {(localError || error) && (
              <div role="alert" className="error-box">
                {localError || error}
              </div>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          {demoMode && (
            <div className="demo-login">
              <div className="divider-label">EXPLORE THE STUDENT DEMO</div>
              <p>
                Choose the view that fits your work. Each view uses the same
                saved demonstration records; these are not employee permissions.
              </p>
              <div className="demo-role-grid">
                {[
                  ["staff", "Planner"],
                  ["reviewer", "Reviewer"],
                  ["scheduling", "Scheduling"],
                ].map(([id, label]) => (
                  <button
                    className="btn secondary"
                    key={id}
                    disabled={busy}
                    onClick={() => login(undefined, `${id}@bakersfield.demo`)}
                  >
                    {label}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <small>
                Mock accounts · Fictional training policies · Local
                demonstration
              </small>
            </div>
          )}
          <p className="login-private">
            <ShieldCheck size={15} />
            Employee sign-in is not enabled on this free demo. No public
            registration.
          </p>
        </div>
      </section>
    </div>
  );
}
function Skyline() {
  return (
    <svg
      className="skyline"
      viewBox="0 0 660 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 165h40v-36h39v36h29V92h56v73h26V55h46v110h23v-61h47v61h20V76h74v89h19v-47h39v47h28V97h73v68h37v-32h45v32h39"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M198 55V40h31v15m-21-15V22m120 54 35-28 35 28M340 90h9m13 0h9m13 0h9m-53 16h9m13 0h9m13 0h9M123 105h8m12 0h8m-28 16h8m12 0h8m-28 16h8m12 0h8M501 112h10m14 0h10m-34 16h10m14 0h10M0 181h660"
        stroke="currentColor"
      />
      <circle cx="563" cy="44" r="24" stroke="currentColor" />
    </svg>
  );
}
