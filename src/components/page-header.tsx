import Link from "next/link";
import { Icon, Text } from "@seed-design/react";
import { IconChevronDownSmallLine } from "@karrotmarket/react-monochrome-icon";
import { BrandLink } from "@/components/brand-link";

export function PageHeader({
  navHref,
  navLabel,
  authSlot,
  exploreMenu = false,
}: {
  navHref?: string;
  navLabel?: string;
  authSlot?: React.ReactNode;
  exploreMenu?: boolean;
}) {
  const shortLabel = navLabel ? navLabel.replace(/하기$/, "") : "";

  return (
    <header className="page-header-container">
      <BrandLink />
      <div className="page-header-actions">
        {exploreMenu && (
          <details className="page-header-explore">
            <summary><span>둘러보기</span><span className="page-header-explore-chevron" aria-hidden="true"><Icon svg={<IconChevronDownSmallLine />} /></span></summary>
            <nav aria-label="콘텐츠 탐색">
              <Link href="/topics">주제별 글</Link>
              <Link href="/blogs">블로그 목록</Link>
              <Link href="/digest">주간 큐레이션</Link>
            </nav>
          </details>
        )}
        {navHref && navLabel && (
          <Link href={navHref} className="page-header-nav-link">
            <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
              <span className="page-header-nav-label-full">{navLabel} →</span>
              <span className="page-header-nav-label-short">{shortLabel} →</span>
            </Text>
          </Link>
        )}
        {authSlot}
      </div>
    </header>
  );
}
