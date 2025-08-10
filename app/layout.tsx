import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Non-Sleep Monitor",
  description: "HTTP monitoring tool",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBhcmlhLWhpZGRlbj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgc3Ryb2tlPSIjMjJjNTVlIiBzdHJva2Utd2lkdGg9IjIiIC8+CjxwYXRoIGQ9Ik0xMiA3djVsMyAzIiBzdHJva2U9IiMyMmM1NWUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiAvPgo8L3N2Zz4K",
        type: "image/svg+xml",
      },
    ],
  },
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


