import { createSupabaseServerClient } from "./supabase-server";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}
