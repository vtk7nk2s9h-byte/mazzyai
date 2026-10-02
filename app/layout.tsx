import "../app/ui/global.css";
import { auth } from "@/auth";
import { Header } from "@/components/ui/header-3";
import MaroonDataWires from "@/components/ui/maroon-data-wires";
import { Toaster } from "@/components/ui/toaster";
import { themeScript } from "./ui/theme-script";
import { inter } from "./ui/fonts";
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: {
    template: '%s | Mazzy AI',
    default: 'Mazzy AI',
  },
  description: 'Your next AI voice agents recruiter',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The marketing header is for signed-out visitors only; once you're in, the
  // dashboard's own chrome takes over. Reading the session here is what makes
  // every route dynamic — acceptable because the middleware already runs auth
  // on each request, so nothing in this app was being served statically.
  const session = await auth();

  return (
    // The head script sets data-theme/class on <html> before React hydrates,
    // so the server and client markup differ here by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* text/plain on the client: React warns when a component renders a
            <script>, and a client-rendered one never executes anyway — the
            server copy already ran during HTML parsing. */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <MaroonDataWires />
        {!session?.user && <Header />}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
