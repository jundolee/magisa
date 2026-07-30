"use client";

import { useEffect, useState } from "react";
import { Icon } from "@seed-design/react";
import { IconArrowUpFill } from "@karrotmarket/react-monochrome-icon";

const SHOW_AFTER_PX = 400;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "1px solid var(--seed-color-stroke-neutral)",
        background: "var(--seed-color-bg-layer-default)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 50,
      }}
    >
      <Icon svg={<IconArrowUpFill />} />
    </button>
  );
}
