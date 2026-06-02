"use client"

import { AppProvider } from "@/lib/context"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
