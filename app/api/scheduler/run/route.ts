import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { monitorScheduler } from '@/lib/scheduler';
import type { RequestConfig } from '@/lib/types';

export const runtime = 'edge';

// 주기적 실행을 위한 핸들러 (GET과 POST 모두 지원)
export async function GET(request: NextRequest) {
  return await executeScheduler(request, {});
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await executeScheduler(request, body);
  } catch (error) {
    // JSON 파싱 실패시 빈 객체로 처리
    return await executeScheduler(request, {});
  }
}

async function executeScheduler(request: NextRequest, params: any) {
  try {
    console.log('Scheduler run API called at:', new Date().toISOString());
    console.log('Request method:', request.method);
    console.log('Parameters:', params);
    
    // 활성화된 모든 설정 가져오기
    const configs = await sql`
      select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
      from configs
      where enabled = true
      order by created_at asc
    `;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      console.log('No enabled configs found');
      return NextResponse.json({ ok: true, message: 'No enabled configs' });
    }
    
    console.log(`Found ${configs.length} enabled configs to check`);
    
    const now = new Date();
    const results = [];
    
    // 각 설정에 대해 실행 여부 확인 및 실행
    for (const config of configs) {
      const clientConfig: RequestConfig = {
        id: config.id,
        name: config.name,
        url: config.url,
        method: config.method,
        intervalMs: config.intervalMs,
        formData: config.formData || {},
        enabled: config.enabled
      };
      
      // 스케줄러에 작업 등록 (아직 등록되지 않은 경우)
      monitorScheduler.scheduleMonitor(clientConfig);
      
      // 실행 여부 확인 - 더 정밀한 시간 비교
      const taskStatus = monitorScheduler.getTaskStatus(config.id);
      const shouldRun = !taskStatus?.nextRunAt || taskStatus.nextRunAt <= now;
      
      // 디버깅을 위한 시간 정보 출력
      if (taskStatus?.nextRunAt) {
        const timeDiff = taskStatus.nextRunAt.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        const secondsDiff = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        console.log(`Monitor ${config.name} (${config.id}):`);
        console.log(`  - Current time (UTC): ${now.toISOString()}`);
        console.log(`  - Next run time (UTC): ${taskStatus.nextRunAt.toISOString()}`);
        console.log(`  - Time difference: ${minutesDiff}min ${secondsDiff}s`);
        console.log(`  - Should run: ${shouldRun}`);
      }
      
      if (shouldRun) {
        console.log(`Executing monitor ${config.name} (${config.id}) - scheduled to run`);
        try {
          await monitorScheduler.executeMonitor(clientConfig);
          results.push({ configId: config.id, status: 'success' });
        } catch (error: any) {
          console.error(`Failed to execute monitor ${config.id}:`, error);
          results.push({ configId: config.id, status: 'error', error: error?.message || 'Unknown error' });
        }
      } else {
        console.log(`Monitor ${config.name} (${config.id}) not due yet, next run at: ${taskStatus.nextRunAt?.toISOString()}`);
        results.push({ configId: config.id, status: 'skipped', nextRunAt: taskStatus.nextRunAt?.toISOString() });
      }
    }
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    console.log(`Execution completed: ${successful} successful, ${failed} failed, ${skipped} skipped`);
    
    return NextResponse.json({ 
      ok: true, 
      message: `Executed ${successful} monitors, ${failed} failed, ${skipped} skipped`,
      results,
      params: params  // 받은 파라미터도 응답에 포함
    });
    
  } catch (error: any) {
    console.error('Error in scheduler run API:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
