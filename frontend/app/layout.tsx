import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// ── Metadados dinâmicos via variável de ambiente (White Label) ──
const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Eletrosil";
const primaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#6d28d9";

export const metadata: Metadata = {
  title: `${companyName} — Sistema de Gestão`,
  other: {
    "theme-color": primaryColor,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        {/* ── White Label: Cor primária injetada via CSS Variable ── */}
        <style>{`:root { --color-primary-hex: ${primaryColor}; }`}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
