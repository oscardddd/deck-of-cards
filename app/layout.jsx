import "../src/index.css";

export const metadata = {
  title: "Recipe Deck of Cards",
  description: "Browse simple recipe cards and choose a meal quickly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
