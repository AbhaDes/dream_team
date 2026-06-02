"use client"

import { AppProvider } from "@/lib/context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
