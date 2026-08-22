import Image from "next/image";
import Link from "next/link";
import { Text } from "@seed-design/react";

export function PageHeader({
  navHref,
  navLabel,
  authSlot,
}: {
  navHref?: string;
  navLabel?: string;
  authSlot?: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 20,
        marginBottom: 28,
        borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
      }}
    >
      <Link href="/" aria-label="매일 읽는 테크 기사 홈" style={{ display: "block", lineHeight: 0 }}>
        <Image
          src="/brand-logo.svg"
          alt="매일 읽는 테크 기사"
          width={305}
          height={37}
          priority
          style={{ display: "block", width: "clamp(156px, 45vw, 250px)", height: "auto" }}
        />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {navHref && navLabel && (
          <Link href={navHref}>
            <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
              {navLabel} →
            </Text>
          </Link>
        )}
        <a href="/feed.xml" title="RSS 피드 구독">
          <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            RSS
          </Text>
        </a>
        {authSlot}
      </div>
    </header>
  );
}
