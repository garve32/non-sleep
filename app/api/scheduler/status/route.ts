import { NextResponse } from "next/server";
import { monitorScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// 한국 시간으로 변환하는 함수
function toKoreaTime(date?: Date): string | null {
  if (!date) return null;
  
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    // 폴백: UTC 시간에 9시간 추가
    const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return koreaTime.toISOString().replace('T', ' ').slice(0, 19);
  }
}

export async function GET() {
  try {
    const taskStatus = monitorScheduler.getAllTaskStatus();
    const activeTasks = Array.from(taskStatus.entries()).map(([id, status]) => ({
      id,
      lastRunAt: toKoreaTime(status.lastRunAt),
      nextRunAt: toKoreaTime(status.nextRunAt),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        isInitialized: monitorScheduler.isSchedulerInitialized(),
        activeTasks,
        totalTasks: activeTasks.length,
        runningTasks: monitorScheduler.getRunningTasksCount(),
      }
    });
  } catch (error: any) {
    console.error("Failed to get scheduler status:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
