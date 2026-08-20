import Link from "next/link";
import { Text } from "@seed-design/react";

export function DigestBreadcrumbs({ current }: { current?: string }) {
  return (
    <nav aria-label="이동 경로" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <Link href="/">
        <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
          홈
        </Text>
      </Link>
      <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
        /
      </Text>
      {current ? (
        <>
          <Link href="/digest">
            <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
              주간 큐레이션
            </Text>
          </Link>
          <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
            /
          </Text>
          <Text as="span" textStyle="t2Regular" color="fg.neutral">
            {current}
          </Text>
        </>
      ) : (
        <Text as="span" textStyle="t2Regular" color="fg.neutral">
          주간 큐레이션
        </Text>
      )}
    </nav>
  );
}
