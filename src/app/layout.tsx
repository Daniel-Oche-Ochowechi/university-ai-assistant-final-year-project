import type { Metadata } from "next";
import { Raleway, Raleway as Raleway_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

const ralewayMono = Raleway_Mono({
  variable: "--font-raleway-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIU AI Assistant",
  description: "Mewar International University AI Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <body
          className={`${raleway.variable} ${ralewayMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
