import * as cron from 'node-cron';
import type { RequestConfig } from './types';
import { sql } from './db';

interface ScheduledTask {
  id: string;
  task: cron.ScheduledTask;
  config: RequestConfig;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

class MonitorScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();

  // 모니터링 작업 실행 함수
  private async executeMonitor(config: RequestConfig): Promise<void> {
    console.log(`Executing monitor ${config.name} (${config.id})`);
    const startedAt = Date.now();
    let durationMs = 0;
    let status: number | null = null;
    let ok = false;
    let error: string | null = null;

    try {
      // FormData를 URLSearchParams로 변환
      const formData = new URLSearchParams();
      Object.entries(config.formData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      console.log(`Making ${config.method} request to ${config.url}`);
      
      // HTTP 요청 실행
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: config.method === 'POST' ? formData.toString() : undefined,
      });

      durationMs = Date.now() - startedAt;
      status = response.status;
      ok = response.ok;

      console.log(`Monitor ${config.name} completed: ${status} (${durationMs}ms)`);

      // 로그 저장
      await this.saveLog(config.id, {
        configId: config.id,
        startedAt,
        durationMs,
        status,
        ok,
      });

    } catch (e: any) {
      durationMs = Date.now() - startedAt;
      error = e?.message || 'Network error';
      
      console.log(`Monitor ${config.name} failed: ${error} (${durationMs}ms)`);
      
      // 에러 로그 저장
      await this.saveLog(config.id, {
        configId: config.id,
        startedAt,
        durationMs,
        status: null,
        ok: false,
        error,
      });
    }

    // 작업 정보 업데이트
    const task = this.tasks.get(config.id);
    if (task) {
      task.lastRunAt = new Date();
      task.nextRunAt = new Date(Date.now() + config.intervalMs);
      console.log(`Updated task info for ${config.name}: next run at ${task.nextRunAt.toISOString()}`);
    }
  }

  // 로그 저장 함수 - 직접 데이터베이스에 저장
  private async saveLog(configId: string, logData: any): Promise<void> {
    try {
      console.log(`Saving log for ${configId}:`, logData);
      
      // 직접 데이터베이스에 저장
      await sql`
        insert into logs (config_id, started_at, duration_ms, status, ok, error)
        values (${logData.configId}, ${new Date(logData.startedAt).toISOString()}, ${logData.durationMs}, ${logData.status}, ${!!logData.ok}, ${logData.error || null})
      `;
      
      console.log(`Successfully saved log for ${configId}`);
    } catch (error) {
      console.error(`Error saving log for ${configId}:`, error);
    }
  }

  // 모니터링 작업 추가/업데이트
  public scheduleMonitor(config: RequestConfig): void {
    // 기존 작업이 있다면 제거
    this.stopMonitor(config.id);

    if (!config.enabled) {
      return;
    }

    // 최소 간격 10초 보장
    const intervalMs = Math.max(10000, config.intervalMs);
    
    // cron 표현식 생성 (초 단위로 변환)
    const intervalSeconds = Math.floor(intervalMs / 1000);
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    // 스케줄된 작업 생성
    const task = cron.schedule(cronExpression, () => {
      this.executeMonitor(config);
    });

    // 작업 시작
    task.start();

    // 작업 정보 저장
    this.tasks.set(config.id, {
      id: config.id,
      task,
      config,
      lastRunAt: undefined,
      nextRunAt: new Date(Date.now() + intervalMs),
    });

    console.log(`Scheduled monitor ${config.name} (${config.id}) with interval ${intervalMs}ms`);
  }

  // 모니터링 작업 중지
  public stopMonitor(id: string): void {
    const scheduledTask = this.tasks.get(id);
    if (scheduledTask) {
      scheduledTask.task.stop();
      scheduledTask.task.destroy();
      this.tasks.delete(id);
      console.log(`Stopped monitor ${id}`);
    }
  }

  // 모든 모니터링 작업 중지
  public stopAllMonitors(): void {
    this.tasks.forEach((scheduledTask) => {
      scheduledTask.task.stop();
      scheduledTask.task.destroy();
    });
    this.tasks.clear();
    console.log('Stopped all monitors');
  }

  // 작업 상태 조회
  public getTaskStatus(id: string): { lastRunAt?: Date; nextRunAt?: Date } | null {
    const task = this.tasks.get(id);
    if (task) {
      return {
        lastRunAt: task.lastRunAt,
        nextRunAt: task.nextRunAt,
      };
    }
    return null;
  }

  // 모든 작업 상태 조회
  public getAllTaskStatus(): Map<string, { lastRunAt?: Date; nextRunAt?: Date }> {
    const status = new Map();
    this.tasks.forEach((task, id) => {
      status.set(id, {
        lastRunAt: task.lastRunAt,
        nextRunAt: task.nextRunAt,
      });
    });
    return status;
  }
}

// 싱글톤 인스턴스 생성
export const monitorScheduler = new MonitorScheduler();

// 서버 시작시 모든 활성화된 모니터링 작업 로드
export async function initializeScheduler(): Promise<void> {
  try {
    console.log('Initializing scheduler...');
    
    // 서버가 준비될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 직접 데이터베이스에서 설정 가져오기
    console.log('Fetching configs from database...');
    
    const configs = await sql`
      select id, name, url, method, interval_ms as "intervalMs", form_data as "formData", enabled
      from configs
      where enabled = true
      order by created_at asc
    `;
    
    console.log('Fetched configs from database:', configs);
    
    if (Array.isArray(configs) && configs.length > 0) {
      console.log(`Found ${configs.length} enabled configs:`, configs.map((c: any) => c.name));
      
      configs.forEach((config: any) => {
        // 데이터베이스 형식을 클라이언트 형식으로 변환
        const clientConfig: RequestConfig = {
          id: config.id,
          name: config.name,
          url: config.url,
          method: config.method,
          intervalMs: config.intervalMs,
          formData: config.formData || {},
          enabled: config.enabled
        };
        
        monitorScheduler.scheduleMonitor(clientConfig);
      });
      
      console.log(`Initialized ${configs.length} enabled monitors`);
    } else {
      console.log('No enabled configs found in database');
    }
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
}
