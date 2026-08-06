const ROW_COUNT = 5;

/**
 * ArticleList/ArticleRow와 같은 크기·간격으로 배치해, 실제 데이터가 스트리밍돼 들어올 때
 * 레이아웃이 덜컹거리지 않게 한다.
 */
export function ArticleListSkeleton() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 80, height: 28 }} />
        <div className="skeleton" style={{ width: 110, height: 28 }} />
      </div>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div className="skeleton" style={{ width: 180, height: 40, borderRadius: 20 }} />
        <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 8 }} />
      </div>

      <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", padding: 0, margin: 0 }}>
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: 20,
              padding: "20px 0",
              borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="skeleton" style={{ width: 100, height: 20, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: "70%", height: 22 }} />
              <div className="skeleton" style={{ width: "90%", height: 16 }} />
              <div className="skeleton" style={{ width: 140, height: 14 }} />
            </div>
            <div className="skeleton" style={{ width: "112px", height: "112px", flexShrink: 0 }} />
          </li>
        ))}
      </ul>
    </>
  );
}
