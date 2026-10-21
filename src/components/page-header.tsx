import Link from "next/link";
import { Text } from "@seed-design/react";
import { BrandLink } from "@/components/brand-link";

export function PageHeader({
  navHref,
  navLabel,
  authSlot,
}: {
  navHref?: string;
  navLabel?: string;
  authSlot?: React.ReactNode;
}) {
  const shortLabel = navLabel ? navLabel.replace(/하기$/, "") : "";

  return (
    <header className="page-header-container">
      <BrandLink />
      <div className="page-header-actions">
        {navHref && navLabel && (
          <Link href={navHref} className="page-header-nav-link">
            <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
              <span className="page-header-nav-label-full">{navLabel} →</span>
              <span className="page-header-nav-label-short">{shortLabel} →</span>
            </Text>
          </Link>
        )}
        <a href="/feed.xml" title="RSS 피드 구독" className="page-header-nav-link">
          <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            RSS
          </Text>
        </a>
        {authSlot}
      </div>
    </header>
  );
}
