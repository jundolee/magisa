/** Mirrors the feed columns while the article data streams in. */
export function ArticleListSkeleton() {
  return (
    <div className="feed-layout" aria-busy="true" aria-label="글 목록 불러오는 중">
      <aside className="feed-sidebar" aria-hidden="true">
        {[120, 140, 100, 130, 110].map((width, index) => (
          <div key={index} className="skeleton" style={{ width, height: 24, marginBottom: 22 }} />
        ))}
      </aside>
      <div className="feed-content" aria-hidden="true">
        <div className="feed-intro">
          <p className="feed-eyebrow">개발자의 읽을거리</p>
          <h1>흩어진 기술 이야기,<br className="feed-mobile-break" /> 여기서 이어 읽어요.</h1>
          <p className="feed-description">여러 테크 블로그의 새 글을 한곳에 모았어요.</p>
        </div>
        <div className="skeleton" style={{ height: 48, marginBottom: 48 }} />
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="feed-skeleton-row" key={index}>
            <div className="skeleton" style={{ width: 140, height: 16, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "78%", height: 28, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: "92%", height: 42, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 90, height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
