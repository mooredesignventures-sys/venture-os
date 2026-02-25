import "./globals.css";

export const metadata = {
  title: "Venture OS Foundation",
  description: "Foundation setup",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
