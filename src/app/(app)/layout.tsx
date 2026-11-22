import type { ReactNode } from "react"
import { AppShell } from "@/components/app-shell"
import { loadKitchenAccount } from "@/lib/kitchen/account"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const account = await loadKitchenAccount()
  return <AppShell accountLabel={account.label}>{children}</AppShell>
}
