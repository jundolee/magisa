"use client";

import { startTransition, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { markArticleReadAction } from "@/app/articles/actions";

interface ArticleLinkProps {
  articleId: string;
  articleTitle: string;
  href: string;
  children: ReactNode;
  style?: CSSProperties;
  // 서버 액션 응답(revalidatePath)을 기다리지 않고 클릭 즉시 목록에 읽음으로 반영하기 위한 낙관적 업데이트 콜백.
  onRead?: (articleId: string) => void;
}

/**
 * 클릭 시 원문을 새 탭으로 열면서 동시에 읽음 처리를 트리거한다.
 * 기본 앵커 내비게이션을 막지 않아 새 탭 열기/우클릭 메뉴 등 브라우저 기본 동작은 그대로 유지된다.
 */
export function ArticleLink({ articleId, articleTitle, href, children, style, onRead }: ArticleLinkProps) {
  const trackClick = () => {
    // GTM 맞춤 이벤트 트리거(article_click)로 GA4에서 아티클명 기준 집계가 가능하도록 push
    (window as { dataLayer?: unknown[] }).dataLayer?.push({
      event: "article_click",
      article_id: articleId,
      article_title: articleTitle,
    });
    onRead?.(articleId);
    startTransition(() => {
      markArticleReadAction(articleId);
    });
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onClick={trackClick}
      // 휠 버튼(가운데)이나 우클릭으로 여는 경우 "click"이 아니라 "auxclick"이 발생해 onClick만으로는
      // 읽음 처리가 누락됨. 우클릭 메뉴에서 실제로 "새 탭에서 링크 열기"를 선택했는지는 JS로 알 수 없어
      // (메뉴 선택은 브라우저 네이티브 UI라 관측 불가) 우클릭 자체를 "열었다"로 간주하는 근사치 처리다 —
      // 메뉴를 취소하거나 "링크 복사" 등 다른 항목을 골라도 읽음 처리된다.
      onAuxClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.button === 1 || e.button === 2) trackClick();
      }}
    >
      {children}
    </a>
  );
}
