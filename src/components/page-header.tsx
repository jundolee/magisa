import Link from "next/link";
import { Text } from "@seed-design/react";

export function PageHeader({ navHref, navLabel }: { navHref: string; navLabel: string }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 20,
        marginBottom: 28,
        borderBottom: "1px solid var(--seed-color-stroke-neutral)",
      }}
    >
      <Link href="/">
        <Text as="span" textStyle="t6Bold" color="fg.neutral">
          Magisa
        </Text>
      </Link>
      <Link href={navHref}>
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          {navLabel} →
        </Text>
      </Link>
    </header>
  );
}
