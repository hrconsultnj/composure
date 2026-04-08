import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Composure — Code Review Graph",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
