import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
