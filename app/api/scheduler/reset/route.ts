import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { monitorScheduler } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    console.log('Resetting scheduler...');
    
    // 모든 모니터의 nextRunAt을 현재 시간으로 초기화
    const now = new Date();
    await sql`
      update configs 
      set updated_at = ${now.toISOString()}
      where enabled = true
    `;
    
    // 스케줄러 초기화
    monitorScheduler.stopAllMonitors();
    monitorScheduler.resetInitialization();
    
    // 활성화된 모든 설정을 다시 로드
    const configs = await sql`
      select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
      from configs
      where enabled = true
      order by created_at asc
    `;
    
    if (Array.isArray(configs) && configs.length > 0) {
      configs.forEach((config: any) => {
        const clientConfig = {
          id: config.id,
          name: config.name,
          url: config.url,
          method: config.method,
          intervalMs: config.intervalMs,
          formData: config.formData || {},
          enabled: config.enabled
        };
        
        // nextRunAt을 현재 시간으로 설정
        monitorScheduler.scheduleMonitor(clientConfig);
      });
    }
    
    console.log('Scheduler reset completed');
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Scheduler reset successfully',
      resetTime: now.toISOString()
    });
    
  } catch (error: any) {
    console.error('Error resetting scheduler:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
