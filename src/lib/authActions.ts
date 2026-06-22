import { signIn, signOut } from "next-auth/react";
import { flushToCloud } from "@/lib/storage";

export function signInWithGoogle(): void {
  void signIn("google", { callbackUrl: "/" });
}

export function signOutAndFlush(): void {
  void flushToCloud().finally(() => signOut());
}
