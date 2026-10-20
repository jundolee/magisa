# 제텔카스텐·기사 의미 연결

## 제품 동작

- 기사 연결 화면(`/articles/[id]/connections`)은 Supabase의 기사 메타데이터를 보여주고 원문은 기존처럼 외부 블로그에서 엽니다. `/articles/[id]`의 AI 요약·간단히 보기 화면과 별도 경로입니다.
- 임베딩 작업자가 Pinecone에서 의미상 가까운 기사 후보를 찾아 Supabase에 캐시하고, 기사 연결 화면은 그 캐시를 최대 5개 보여줍니다. 공개 페이지를 열 때 Pinecone을 호출하지 않습니다. 후보는 노트 연결로 자동 저장되지 않습니다.
- 로그인 사용자는 기사에서 자기 말로 쓴 노트를 만들고 출처 기사를 연결합니다. 다른 기사를 기존 노트에 추가할 때 `근거`, `반례`, `사례`, `배경` 관계를 남깁니다.
- 비슷한 기사에 이미 연결해둔 사용자 노트는 현재 기사 화면에 연결 후보로 제안합니다. 사용자가 확인한 뒤 현재 기사와 기존 노트를 연결합니다.
- 노트끼리는 `확장`, `뒷받침`, `반박`, `사례`, `전제`, `관련` 중 하나와 짧은 이유를 기록합니다. 노트의 상세 화면에서 들어오는 연결과 나가는 연결을 모두 볼 수 있습니다.
- 노트와 명시적 연결은 Supabase에만 저장합니다. 사용자 노트 본문은 Pinecone으로 보내지 않습니다.

## Pinecone 인덱스 설정

1. Pinecone 콘솔에서 Serverless integrated-inference 인덱스를 만듭니다.
2. 인덱스 이름은 `techgotgan-articles`를 사용합니다. 임베딩 모델은 `multilingual-e5-large`, 필드 매핑은 `text` → `embedding_text`로 설정합니다.
3. 인덱스 준비가 끝나면 API key와 인덱스 host를 가져와 서버 환경 변수에만 저장합니다.

```dotenv
PINECONE_API_KEY=...
PINECONE_INDEX_HOST=example.svc....pinecone.io
```

벡터 namespace는 `techgotgan-articles-v1`입니다. host에는 `https://`를 붙이지 않습니다. 통합 임베딩 인덱스의 텍스트 필드와 Pinecone SDK 설정을 변경할 때는 새 인덱스를 만들고 문서 매핑과 코드 상수를 함께 바꿔야 합니다.

## Supabase 및 배포

1. `supabase/migrations/0017_zettelkasten_article_vectors.sql`이 제텔카스텐 스키마 마이그레이션입니다. 운영 프로젝트에는 SQL Editor로 이미 적용했으며, 기존 `0013`–`0016` 이력도 Dashboard에서 수동 적용된 상태입니다. 원격 migration history가 없으므로 `supabase db push`는 실행하지 않습니다.
2. Vercel Production에 `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`를 서버 전용 환경 변수로 등록합니다. `NEXT_PUBLIC_` 접두사는 붙이지 않습니다. Pinecone TypeScript SDK v9이 요구하는 Node.js 22 이상을 사용합니다.
3. 배포 후 `/api/cron/embeddings`가 매일 00:00 UTC에 새 작업과 재시도 대기열을 처리합니다.
4. 초기 백필은 보호된 endpoint를 직접 호출해 여러 번 나눠 처리할 수 있습니다. 끝까지 처리되면 `embeddingsClaimed`가 `0`입니다.

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://techgotgan.vercel.app/api/cron/embeddings?limit=200"
```

응답의 `configured`가 `false`이면 Pinecone 환경 변수를 확인합니다. `embeddingsFailed`나 `deletionsFailed`가 0보다 크면 `article_embedding_jobs` 또는 `article_embedding_deletions`의 `last_error`, `attempts`, `status`를 확인합니다. DB는 실패 후 30분부터 재시도를 허용하고 최대 8회 시도합니다. 자동 크론은 하루 한 번 실행되므로 다음 크론 전 수동 실행으로 재시도하거나 Pinecone 복구 뒤 SQL에서 `status='pending'`, `attempts=0`, `next_attempt_at=now()`로 되돌릴 수 있습니다.

## 데이터 및 실패 처리

- Supabase가 기사, 노트, 출처와 확정된 노트 관계의 원본입니다. Pinecone은 공개 기사 메타데이터 검색에만 씁니다.
- 새 기사와 제목·요약·주제·태그 변경은 Postgres trigger가 embedding 작업을 큐에 넣습니다. Pinecone 호출이 실패해도 기사 저장은 성공합니다.
- 색인 작업은 고정된 모델 `multilingual-e5-large`와 콘텐츠 hash를 저장합니다. 중복 upsert는 기사 UUID를 사용하므로 재시도해도 같은 벡터를 갱신합니다.
- 기사나 소스를 삭제하면 tombstone 작업이 남아 해당 Pinecone 벡터도 비동기 삭제합니다.
- Pinecone이 설정되지 않았거나 일시 중단되면 기사 피드와 개인 노트 기능은 계속 동작하며, 관련 기사만 대기/실패 상태를 표시합니다.

## 로컬 검증

```sh
npm test
npm run lint
npm run build
```
