import { useTenant } from "@/core/tenant-context";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { siteName } from "@/core/seo";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: ({ matches }) => ({
    meta: [
      { title: `Sign in — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Sign in to your ${siteName(matches)} account to manage your volunteering, donations and applications.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Sign in — ${siteName(matches)}` },
      { property: "og:description", content: "Access your foundation account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

function AuthPage() {
  const tenant = useTenant();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const target = safePath(redirect);

  useEffect(() => {
    if (!loading && user) navigate({ to: target, replace: true });
  }, [loading, user, target, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center font-display text-lg font-semibold">
          {tenant.name}
        </Link>
        <div className="surface-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="mb-5 w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <PhoneOtpForm target={target} />
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> or email &amp; password <span className="h-px flex-1 bg-border" /></div>
              <SignInForm target={target} />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm target={target} />
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton target={target} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleButton({ target }: { target: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` },
      });
      if (error) {
        toast.error("Google sign-in failed. Please try again.");
      }
      // On success the browser goes to Google, then back to /auth?redirect=…, which forwards once the session exists.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={signIn} disabled={busy}>
      {busy ? "Opening Google…" : "Continue with Google"}
    </Button>
  );
}

function SignInForm({ target }: { target: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: target, replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" required>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password" required>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ target }: { target: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}${target}`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Account created. Check your email to confirm.");
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account,
        then sign in.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Email" required>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password" required hint="At least 6 characters">
        <Input
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

/** Mobile number → OTP on WhatsApp (Supabase phone auth; the OTP goes through the shared whatsapp-otp-hook). Same account as शोकपत्र. */
function PhoneOtpForm({ target }: { target: string }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (raw.length !== 10) { toast.error("10 अंकों का मोबाइल नंबर लिखिए"); return; }
    const full = "+91" + raw;
    setBusy(true);
    try {
      if (!sent) {
        const { error } = await supabase.auth.signInWithOtp({ phone: full, options: { shouldCreateUser: true } });
        if (error) throw error;
        setSent(true); toast.success("कोड आपके WhatsApp पर भेज दिया गया है");
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone: full, token: code.trim(), type: "sms" });
        if (error) throw error;
        navigate({ to: target, replace: true });
      }
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="मोबाइल नंबर (WhatsApp OTP)" required>
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">+91</span><Input inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => { setPhone(e.target.value); setSent(false); }} required /></div>
      </Field>
      {sent ? <Field label="WhatsApp पर आया 6 अंकों का कोड" required><Input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} required /></Field> : null}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : sent ? "लॉगिन करें" : "WhatsApp पर कोड भेजें"}</Button>
      {sent ? <button type="button" className="w-full text-center text-xs text-muted-foreground underline" onClick={() => setSent(false)}>कोड दोबारा भेजें / नंबर बदलें</button> : null}
    </form>
  );
}
