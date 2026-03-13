import { TelegramLoginCard } from "@/components/telegram-login-card";

export default function TelegramAuthPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <TelegramLoginCard />
    </main>
  );
}
