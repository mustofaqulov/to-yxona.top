import type { Metadata } from "next";
import { AppSettingsProvider } from "@/components/AppSettings";
import { FavoritesProvider } from "@/components/Favorites";
import "./globals.css";

export const metadata: Metadata = {
  title: "To'yxona Top — to'yxonani oson toping",
  description: "O'zbekistondagi to'yxonalarni toping, solishtiring va band qiling.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AppSettingsProvider><FavoritesProvider>{children}</FavoritesProvider></AppSettingsProvider>
      </body>
    </html>
  );
}
