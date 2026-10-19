import Image from "next/image";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { SITE_NAME } from "@/app/seo";

export function BrandLink() {
  return (
    <Link
      href="/"
      aria-label={`${SITE_NAME} 홈`}
      style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: 1 }}
    >
      <Image
        src="/brand/techgotgan-icon.svg"
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
      />
      <Text as="span" textStyle="t6Bold" color="var(--seed-color-fg-brand)">
        {SITE_NAME}
      </Text>
    </Link>
  );
}
