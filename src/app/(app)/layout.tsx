import { Suspense, type ReactNode } from "react"
import { AppShell } from "@/components/app-shell"
import { Header } from "@/components/header"
import { loadKitchenAccount } from "@/lib/kitchen/account"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      header={
        <Suspense fallback={<Header accountLabel="Účet" />}>
          <AccountHeader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}

async function AccountHeader() {
  const account = await loadKitchenAccount()
  return <Header accountLabel={account.label} />
}
