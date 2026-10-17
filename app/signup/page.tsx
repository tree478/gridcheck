import type { Metadata } from "next";
import SignupForm from "@/components/signup/SignupForm";

export const metadata: Metadata = { title: "Sign up · GridWait" };

export default function SignupPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Sign up</h1>
      <p className="mt-4 leading-relaxed text-secondary">
        This profile stays on this device. It is not a real account and is not
        real security. GridWait has no server login.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
    </article>
  );
}
