import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "港式台牌計番練習",
  description: "出一副食胡牌，練習計番。只跟這張番數表。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
