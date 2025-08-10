# Cron-job.org 설정 가이드

## 1. 가입 및 로그인
- https://cron-job.org 접속
- 무료 계정 생성

## 2. 새 크론잡 생성
1. **"CREATE CRONJOB"** 버튼 클릭
2. **기본 설정**:
   - **Title**: "Non-Sleep Monitor"
   - **URL**: `https://non-sleep.vercel.app/api/scheduler/run`
   - **Method**: POST

3. **Headers 설정**:
   - **Name**: `Content-Type`
   - **Value**: `application/json`

4. **Body 설정**:
```json
{
  "source": "cron-job.org",
  "timestamp": "{{timestamp}}",
  "environment": "production",
  "trigger": "scheduled"
}
```

5. **스케줄 설정**:
   - **Every**: 5 minutes
   - **Timezone**: UTC

## 3. 장점
- ✅ **정확한 5분 간격**
- ✅ **무료**
- ✅ **실행 로그 확인**
- ✅ **POST 파라미터 지원**

## 4. GitHub Actions 대체
현재 GitHub Actions를 비활성화하고 Cron-job.org 사용
