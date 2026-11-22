import type { Metadata } from "next"
import { PasswordResetForm } from "@/components/password-reset-form"

export const metadata: Metadata = {
  title: "Nové heslo",
}

export default function PasswordResetPage() {
  return <PasswordResetForm />
}
