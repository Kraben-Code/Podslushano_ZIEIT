import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Подслушано ЗІЕІТ — студентська спільнота",
  description:
    "Простір для спілкування, думок і студентського життя ЗІЕІТ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("zieit-theme")==="dark")document.documentElement.classList.add("dark")}catch{}',
          }}
        />
        {children}
      </body>
    </html>
  );
}
