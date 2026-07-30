"use client";

import { startTransition, type CSSProperties, type ReactNode } from "react";
import { markArticleReadAction } from "@/app/articles/actions";

interface ArticleLinkProps {
  articleId: string;
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * 클릭 시 원문을 새 탭으로 열면서 동시에 읽음 처리를 트리거한다.
 * 기본 앵커 내비게이션을 막지 않아 새 탭 열기/우클릭 메뉴 등 브라우저 기본 동작은 그대로 유지된다.
 */
export function ArticleLink({ articleId, href, children, style }: ArticleLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onClick={() => {
        startTransition(() => {
          markArticleReadAction(articleId);
        });
      }}
    >
      {children}
    </a>
  );
}
