# 기사 의미 기반 추천 운영

## 제품 동작

- 기사 모달과 상세 화면은 Supabase에 캐시된 의미상 관련 기사 후보를 최대 5개 보여줍니다. 후보가 없거나 아직 준비되지 않았으면 카테고리·태그 기반 추천으로 폴백합니다.
- `/articles/[id]/connections`와 `/notes`는 기존 링크를 보존하는 리다이렉트 경로입니다. 개인 노트 CRUD와 사용자가 정의하는 노트 간 관계 기능은 main에서 제거했습니다.
- 임베딩은 공개 기사 제목·요약·카테고리·태그만 사용합니다. 개인 노트 테이블과 본문은 운영 DB에서 제거했습니다.
- 관련 기사는 후보일 뿐이며 사용자가 별도의 지식 관계를 확정하거나 저장하지 않습니다.

## Pinecone 인덱스 설정

1. Pinecone Serverless document-schema 인덱스 `techgotgan-articles`를 사용합니다.
2. `embedding_text`는 `multilingual-e5-large` 통합 임베딩 필드(1024차원, cosine), `title`은 full-text 검색 필드입니다.
3. namespace는 `techgotgan-articles-v1`입니다. `PINECONE_INDEX_HOST`에는 `https://`를 붙이지 않습니다.
4. Pinecone TypeScript SDK v9의 document API로 적재·검색·삭제합니다. 이 스키마에서는 `index.documents.upsert/search/delete`를 사용하며 `upsertRecords`, `searchRecords`, `deleteMany`는 사용할 수 없습니다.
5. API key와 index host는 Vercel Production 및 필요한 Preview 환경의 서버 전용 변수로만 등록합니다. `NEXT_PUBLIC_` 접두사는 붙이지 않습니다.

## Supabase 및 크론

- `0017_zettelkasten_article_vectors.sql`은 기사 임베딩 outbox와 후보 캐시를 추가했습니다. 같은 migration에 있던 빈 개인 노트 테이블과 RPC는 `0018_remove_unused_zettelkasten_notes.sql`에서 제거합니다.
- 이 프로젝트의 migration history는 Dashboard에 없으므로 운영 SQL은 Supabase SQL Editor에서 수동 적용합니다. `supabase db push`는 실행하지 않습니다.
- 새 기사나 제목·요약·카테고리·태그 변경은 Postgres trigger가 `article_embedding_jobs`에 작업을 넣습니다. `/api/cron/embeddings`가 하루 한 번 최대 200건씩 처리하며, 재시도는 보호된 endpoint를 직접 호출할 수 있습니다.
- 기사 삭제는 `article_embedding_deletions` tombstone으로 Pinecone 문서를 비동기 삭제합니다.

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://techgotgan.vercel.app/api/cron/embeddings?limit=200"
```

응답에서 `configured`가 `false`이면 Pinecone 환경 변수를 확인합니다. `embeddingsFailed`나 `deletionsFailed`가 0보다 크면 해당 큐 테이블의 `last_error`, `attempts`, `status`를 확인합니다. 자동 크론은 하루 한 번이므로 수정 후 수동 endpoint로 재시도할 수 있습니다.

## 운영 확인 (2026-10-22)

- main에서 개인 노트 기능을 제거한 뒤 Supabase 운영 DB에서 `zettel_notes`, `zettel_note_articles`, `zettel_note_links`가 모두 0행임을 확인했습니다.
- 같은 시점에 기사 임베딩 작업은 2,362건(2,358 indexed, 4 pending), 후보 캐시는 52,742건, 삭제 큐는 0건이었습니다. 기사 변경·삭제 트리거는 계속 유지합니다.
- cleanup migration은 개인 노트 테이블에 데이터가 생기면 중단하도록 guard를 둡니다. 0017 migration은 재생성 가능한 스키마 복구 지점으로 보존합니다.
