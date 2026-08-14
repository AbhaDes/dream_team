"use client"

import { AppProvider } from "@/lib/context"
import {Toaster} from 'sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider >{children}</AppProvider>
        <Toaster/>
      </body>
    </html>
    );
}
