import type { Metadata } from "next";
import LoginForm from "@/components/login/LoginForm";

export const metadata: Metadata = { title: "Log in · GridCheck" };

export default function LoginPage() {
  return (
    <div className="flex-1 bg-bg">
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          Log in
        </h1>
        <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
          Sign in to see your tracked schedules and emissions. Profiles stay on
          this device — this is not a real server account.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </article>
    </div>
  );
}
