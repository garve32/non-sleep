import { NextResponse } from "next/server";
import { monitorScheduler, initializeScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log('Manual scheduler reset requested');
    
    // 모든 모니터 중지
    monitorScheduler.stopAllMonitors();
    
    // 초기화 상태 리셋
    monitorScheduler.resetInitialization();
    
    // 다시 초기화
    await initializeScheduler();
    
    return NextResponse.json({ 
      ok: true, 
      message: "Scheduler reset and reinitialized successfully" 
    });
  } catch (error: any) {
    console.error("Failed to reset scheduler:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
