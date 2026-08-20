import Link from "next/link";
import { Text } from "@seed-design/react";

export function DigestHeader() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        paddingBottom: 20,
        marginBottom: 28,
        borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
      }}
    >
      <Link href="/" aria-label="Magisa 홈">
        <Text as="span" textStyle="t6Bold" color="fg.neutral">
          Magisa
        </Text>
      </Link>
      <Link href="/">
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          최신 글 보기 →
        </Text>
      </Link>
    </header>
  );
}
