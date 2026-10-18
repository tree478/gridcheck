import type { Metadata } from "next";
import SignupForm from "@/components/signup/SignupForm";

export const metadata: Metadata = { title: "Sign up · GridCheck" };

export default function SignupPage() {
  return (
    <div className="flex-1 bg-bg">
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          Sign up
        </h1>
        <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
          Create a profile on this device, agree to the terms, then view your
          tracked schedules and emissions. This is not a real server account.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </article>
    </div>
  );
}
