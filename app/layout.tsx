import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Non-Sleep Monitor",
  description: "HTTP monitoring tool",
};

// 서버 시작시 스케줄러 초기화
if (typeof window === 'undefined') {
  // 서버 사이드에서만 실행
  console.log('Server starting - initializing scheduler...');
  
  // 약간의 지연 후 스케줄러 초기화
  setTimeout(async () => {
    try {
      const { initializeScheduler } = await import('@/lib/scheduler');
      await initializeScheduler();
      console.log('Scheduler initialization completed');
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
    }
  }, 3000);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}


