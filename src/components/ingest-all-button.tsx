"use client";

import { useState, useTransition } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { ingestSourceNowAction } from "@/app/sources/actions";

/**
 * 소스 전체를 한 서버 액션 안에서 순회하면 소스 수가 늘어날수록 서버리스 함수 실행 시간 제한에
 * 걸려 에러 페이지가 뜰 수 있어(각 소스의 스크래핑/썸네일 미러링이 순차 네트워크 호출이라 누적됨),
 * 기존 "지금 수집"(소스 1건) 액션을 클라이언트에서 순차 호출하는 방식으로 처리한다.
 * 이러면 요청 하나하나는 항상 짧게 끝나고, 진행 상황도 자연스럽게 표시할 수 있다.
 */
export function IngestAllButton({ sourceIds }: { sourceIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: number; inserted: number } | null>(null);

  const handleClick = () => {
    setResult(null);
    startTransition(async () => {
      const total = sourceIds.length;
      let succeeded = 0;
      let failed = 0;
      let inserted = 0;
      setProgress({ done: 0, total });

      for (const id of sourceIds) {
        const formData = new FormData();
        formData.set("id", id);
        const res = await ingestSourceNowAction({ ok: true, message: "" }, formData);
        if (res.ok) {
          succeeded += 1;
          inserted += res.inserted ?? 0;
        } else {
          failed += 1;
        }
        setProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
      }

      setResult({ succeeded, failed, inserted });
      setProgress(null);
    });
  };

  const statusText = progress
    ? `수집 중... (${progress.done}/${progress.total})`
    : result
      ? result.failed > 0
        ? `${result.succeeded}개 성공, ${result.failed}개 실패, 새 글 ${result.inserted}개`
        : `${result.succeeded}개 성공, 새 글 ${result.inserted}개`
      : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ActionButton
        type="button"
        variant="neutralOutline"
        size="small"
        loading={isPending}
        disabled={sourceIds.length === 0}
        onClick={handleClick}
      >
        전체 지금 수집
      </ActionButton>
      {statusText && (
        <span
          style={{
            fontSize: 12,
            color:
              result && result.failed > 0
                ? "var(--seed-color-fg-critical)"
                : "var(--seed-color-fg-neutral-muted)",
          }}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}
