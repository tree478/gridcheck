import type { Metadata } from "next";
import LoginForm from "@/components/login/LoginForm";

export const metadata: Metadata = { title: "Log in · GridWait" };

export default function LoginPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-4 leading-relaxed text-secondary">
        This profile stays on this device. It is not a real account and is not
        real security. GridWait has no server login.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </article>
  );
}
