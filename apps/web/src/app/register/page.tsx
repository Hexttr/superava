import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthPageBackground } from "@/components/auth-page-background";
import { getCurrentUser } from "@/lib/server-api";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <>
      <AuthPageBackground />
      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <AuthForm mode="register" />
      </main>
    </>
  );
}
