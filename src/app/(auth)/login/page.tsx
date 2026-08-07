import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Connexion — MurProtec",
  description: "Accès sécurisé aux dashboards financiers Murpro Group",
};

type LoginPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawFrom = params.from;
  const from =
    typeof rawFrom === "string" &&
    rawFrom.startsWith("/") &&
    !rawFrom.startsWith("//")
      ? rawFrom
      : "/tresorerie";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <LoginForm redirectTo={from} />
    </div>
  );
}
