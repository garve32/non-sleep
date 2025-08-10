import { NextResponse } from "next/server";
import { monitorScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const taskStatus = monitorScheduler.getAllTaskStatus();
    const activeTasks = Array.from(taskStatus.entries()).map(([id, status]) => ({
      id,
      lastRunAt: status.lastRunAt?.toISOString(),
      nextRunAt: status.nextRunAt?.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        isInitialized: monitorScheduler.isSchedulerInitialized(),
        activeTasks,
        totalTasks: activeTasks.length,
      }
    });
  } catch (error: any) {
    console.error("Failed to get scheduler status:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
