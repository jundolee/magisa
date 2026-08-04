"use client";

import { startTransition, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { markArticleReadAction } from "@/app/articles/actions";

interface ArticleLinkProps {
  articleId: string;
  articleTitle: string;
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * 클릭 시 원문을 새 탭으로 열면서 동시에 읽음 처리를 트리거한다.
 * 기본 앵커 내비게이션을 막지 않아 새 탭 열기/우클릭 메뉴 등 브라우저 기본 동작은 그대로 유지된다.
 */
export function ArticleLink({ articleId, articleTitle, href, children, style }: ArticleLinkProps) {
  const trackClick = () => {
    // GTM 맞춤 이벤트 트리거(article_click)로 GA4에서 아티클명 기준 집계가 가능하도록 push
    (window as { dataLayer?: unknown[] }).dataLayer?.push({
      event: "article_click",
      article_id: articleId,
      article_title: articleTitle,
    });
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
      // 휠 버튼(가운데) 클릭으로 백그라운드 새 탭에 여는 경우 "click"이 아니라 "auxclick"이 발생해
      // onClick만으로는 읽음 처리가 누락됨 — 목록에서 여러 글을 새 탭으로 열어두는 흔한 사용 패턴이라 별도로 처리.
      onAuxClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.button === 1) trackClick();
      }}
    >
      {children}
    </a>
  );
}
