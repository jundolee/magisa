import Link from "next/link";
import { Text } from "@seed-design/react";
import { SITE_NAME } from "@/app/seo";

export function BrandLink() {
  return (
    <Link href="/" aria-label={`${SITE_NAME} 홈`} style={{ display: "block", lineHeight: 1 }}>
      <Text as="span" textStyle="t6Bold" color="var(--seed-color-fg-brand)">
        {SITE_NAME}
      </Text>
    </Link>
  );
}
