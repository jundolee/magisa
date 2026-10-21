import Link from "next/link";
import { SITE_NAME } from "@/app/seo";

export function PageFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-links">
        <Link href="/privacy" className="app-footer-link app-footer-link-privacy">
          개인정보처리방침
        </Link>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <Link href="/suggest" className="app-footer-link">
          블로그 추천
        </Link>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <a href="/feed.xml" className="app-footer-link">
          RSS
        </a>
      </div>
      <p className="app-footer-copy">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
