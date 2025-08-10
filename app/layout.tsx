import "./globals.css";
export const metadata = {
  title: "Non Sleep",
  description: "Lightweight HTTP pinger"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body
        style={{
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica, Arial',
          margin: 0,
          background: '#0b0d10',
          color: '#e6e8eb'
        }}
      >
        {children}
      </body>
    </html>
  );
}


