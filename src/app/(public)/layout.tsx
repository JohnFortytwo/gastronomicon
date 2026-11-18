import type { ReactNode } from "react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="flex justify-end px-4 pt-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8">{children}</div>
    </div>
  )
}
