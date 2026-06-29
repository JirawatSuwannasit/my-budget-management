import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "My Budget Management",
  description: "Private mobile-first finance control dashboard for real available money.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#0a0e16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Resolve the theme server-side so the correct palette renders with no flash.
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="th" className={theme === "light" ? "light" : ""}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
