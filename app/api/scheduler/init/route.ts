import { NextResponse } from "next/server";
import { initializeScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log('Manual scheduler initialization requested');
    await initializeScheduler();
    return NextResponse.json({ ok: true, message: "Scheduler initialized successfully" });
  } catch (error: any) {
    console.error("Failed to initialize scheduler:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
