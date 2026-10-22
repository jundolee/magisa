import Link from "next/link";
import { Icon } from "@seed-design/react";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { BrandLink } from "./brand-link";
import { HeaderAuthSlot } from "./header-auth-slot";

export function FeedHeader() {
  return (
    <header className="feed-header">
      <BrandLink />
      <nav className="feed-primary-nav" aria-label="콘텐츠 탐색">
        <Link href="/" aria-current="page">글 모아보기</Link>
        <Link href="/digest">주간 큐레이션</Link>
        <Link href="/blogs">블로그 목록</Link>
      </nav>
      <div className="feed-header-actions">
        <Link href="/suggest" className="feed-suggest-link">블로그 추천 ↗</Link>
        <a href="#feed-search" className="feed-search-shortcut" aria-label="글 검색으로 이동"><Icon svg={<IconMagnifyingglassLine />} /></a>
        <HeaderAuthSlot compact />
        <details className="feed-header-more">
          <summary aria-label="더보기">⋯</summary>
          <nav aria-label="추가 탐색">
            <Link href="/topics">주제별 글</Link>
            <Link href="/blogs">블로그 목록</Link>
            <Link href="/digest">주간 큐레이션</Link>
            <Link href="/suggest">블로그 추천하기</Link>
            <a href="/feed.xml">RSS 구독</a>
            <Link href="/login?intent=signup">회원가입</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
