import { NextResponse } from "next/server";
import { monitorScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = monitorScheduler.getAllTaskStatus();
    const statusArray = Array.from(status.entries()).map(([id, data]) => ({
      id,
      lastRunAt: data.lastRunAt?.toISOString(),
      nextRunAt: data.nextRunAt?.toISOString(),
    }));

    return NextResponse.json({ 
      ok: true, 
      data: {
        activeTasks: statusArray,
        totalTasks: status.size
      }
    });
  } catch (error: any) {
    console.error("GET /api/scheduler/status error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
