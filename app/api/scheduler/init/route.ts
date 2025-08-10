import { NextResponse } from "next/server";
import { initializeScheduler, monitorScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log('Manual scheduler initialization requested');
    
    // 이미 초기화된 경우 상태만 반환
    if (monitorScheduler.isSchedulerInitialized()) {
      const taskStatus = monitorScheduler.getAllTaskStatus();
      const activeTasks = Array.from(taskStatus.entries()).map(([id, status]) => ({
        id,
        lastRunAt: status.lastRunAt?.toISOString(),
        nextRunAt: status.nextRunAt?.toISOString(),
      }));

      return NextResponse.json({ 
        ok: true, 
        message: "Scheduler already initialized",
        data: {
          isInitialized: true,
          activeTasks,
          totalTasks: activeTasks.length,
          runningTasks: monitorScheduler.getRunningTasksCount(),
        }
      });
    }
    
    // 스케줄러 초기화
    await initializeScheduler();
    
    // 초기화 후 상태 확인
    const taskStatus = monitorScheduler.getAllTaskStatus();
    const activeTasks = Array.from(taskStatus.entries()).map(([id, status]) => ({
      id,
      lastRunAt: status.lastRunAt?.toISOString(),
      nextRunAt: status.nextRunAt?.toISOString(),
    }));

    return NextResponse.json({ 
      ok: true, 
      message: "Scheduler initialized successfully",
      data: {
        isInitialized: monitorScheduler.isSchedulerInitialized(),
        activeTasks,
        totalTasks: activeTasks.length,
        runningTasks: monitorScheduler.getRunningTasksCount(),
      }
    });
  } catch (error: any) {
    console.error("Failed to initialize scheduler:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// GET 요청으로도 초기화 가능하도록 추가
export async function GET() {
  return POST();
}
