import { AppHeader } from "@/components/layout/AppHeader";
import { AiAssistant } from "@/components/poc/AiAssistant";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </main>
      <AiAssistant />
    </>
  );
}
