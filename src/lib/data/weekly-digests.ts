import "server-only";
import { getCategoryMeta } from "@/lib/categories";
import { fetchCachedFromSupabase } from "@/lib/supabase/cached-rest";

const KOREA_TIME_ZONE = "Asia/Seoul";
const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ARCHIVE_ARTICLE_LIMIT = 1000;
const LATEST_ARTICLE_LIMIT = 24;

export interface DigestArticle {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string;
  category: string | null;
  source: {
    id: string;
    title: string | null;
    site_url: string;
  } | null;
}

export interface DigestDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface DigestArchiveItem {
  week: string;
  label: string;
  dateRangeLabel: string;
  articleCount: number;
}

export interface WeeklyDigest {
  week: string;
  label: string;
  dateRangeLabel: string;
  articleCount: number;
  latestArticles: DigestArticle[];
  categoryDistribution: DigestDistributionItem[];
  sourceDistribution: DigestDistributionItem[];
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface IsoWeek {
  year: number;
  week: number;
}

interface DigestArticleRow extends DigestArticle {
  published_at: string;
}

const koreaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

function getKoreaCalendarDate(date: Date): CalendarDate {
  const parts = koreaDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getIsoWeekFromCalendarDate({ year, month, day }: CalendarDate): IsoWeek {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isoDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - isoDay);

  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);

  return { year: isoYear, week };
}

function getIsoWeeksInYear(year: number): number {
  return getIsoWeekFromCalendarDate({ year, month: 12, day: 28 }).week;
}

function getIsoWeekStart({ year, week }: IsoWeek): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const mondayOffset = (januaryFourth.getUTCDay() || 7) - 1;

  return new Date(Date.UTC(year, 0, 4 - mondayOffset + (week - 1) * 7));
}

function toKoreaMidnight(date: Date): Date {
  return new Date(date.getTime() - KOREA_UTC_OFFSET_MS);
}

function toWeekId({ year, week }: IsoWeek): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function toWeekLabel({ year, week }: IsoWeek): string {
  return `${year}년 ${week}주차`;
}

function getWeekDateRange(isoWeek: IsoWeek): { start: Date; end: Date; dateRangeLabel: string } {
  const startCalendarDay = getIsoWeekStart(isoWeek);
  const endCalendarDay = new Date(startCalendarDay.getTime() + 6 * DAY_MS);
  const start = toKoreaMidnight(startCalendarDay);
  const end = toKoreaMidnight(new Date(startCalendarDay.getTime() + 7 * DAY_MS));

  return {
    start,
    end,
    dateRangeLabel: `${koreanDateFormatter.format(toKoreaMidnight(startCalendarDay))} – ${koreanDateFormatter.format(
      toKoreaMidnight(endCalendarDay)
    )}`,
  };
}

function parseIsoWeek(value: string): IsoWeek | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > getIsoWeeksInYear(year)) return null;

  return { year, week };
}

function createDistribution(
  articles: DigestArticle[],
  getLabel: (article: DigestArticle) => string
): DigestDistributionItem[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    const label = getLabel(article);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, percentage: Math.round((count / articles.length) * 100) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}

function formatArchiveItem(week: IsoWeek, articleCount: number): DigestArchiveItem {
  const { dateRangeLabel } = getWeekDateRange(week);
  return {
    week: toWeekId(week),
    label: toWeekLabel(week),
    dateRangeLabel,
    articleCount,
  };
}

/** URL 경로로 들어오는 값도 이 함수로 검증해 존재하지 않는 53주차 등을 404로 처리한다. */
export function isValidDigestWeek(value: string): boolean {
  return parseIsoWeek(value) !== null;
}

/** 최근에 글이 있었던 주차만 모아, 색인 가능한 아카이브 진입점을 만든다. */
export async function listRecentDigestWeeks(): Promise<DigestArchiveItem[]> {
  const articles = await fetchCachedFromSupabase<Pick<DigestArticleRow, "published_at">[]>(
    "articles",
    {
      select: "published_at",
      published_at: "not.is.null",
      order: "published_at.desc",
      limit: String(RECENT_ARCHIVE_ARTICLE_LIMIT),
    },
    { revalidate: 900, tags: ["articles"] }
  );

  const articleCounts = new Map<string, { isoWeek: IsoWeek; count: number }>();
  for (const article of articles) {
    const isoWeek = getIsoWeekFromCalendarDate(getKoreaCalendarDate(new Date(article.published_at)));
    const week = toWeekId(isoWeek);
    const current = articleCounts.get(week);
    articleCounts.set(week, { isoWeek, count: (current?.count ?? 0) + 1 });
  }

  return [...articleCounts.values()]
    .sort((a, b) => b.isoWeek.year - a.isoWeek.year || b.isoWeek.week - a.isoWeek.week)
    .slice(0, 12)
    .map(({ isoWeek, count }) => formatArchiveItem(isoWeek, count));
}

/** 한 주의 기사와 통계를 같은 시간 범위로 조회해 목록과 분포가 어긋나지 않게 한다. */
export async function getWeeklyDigest(week: string): Promise<WeeklyDigest | null> {
  const isoWeek = parseIsoWeek(week);
  if (!isoWeek) return null;

  const { start, end, dateRangeLabel } = getWeekDateRange(isoWeek);
  const articles = await fetchCachedFromSupabase<DigestArticleRow[]>(
    "articles",
    {
      select: "id,title,url,excerpt,published_at,category,source:sources(id,title,site_url)",
      // fetchCachedFromSupabase는 같은 키를 두 번 받을 수 없으므로 PostgREST의 and 필터로 범위를 표현한다.
      and: `(published_at.gte.${start.toISOString()},published_at.lt.${end.toISOString()})`,
      order: "published_at.desc",
      limit: "1000",
    },
    { revalidate: 300, tags: ["articles"] }
  );

  if (articles.length === 0) return null;

  return {
    week,
    label: toWeekLabel(isoWeek),
    dateRangeLabel,
    articleCount: articles.length,
    latestArticles: articles.slice(0, LATEST_ARTICLE_LIMIT),
    categoryDistribution: createDistribution(articles, (article) => getCategoryMeta(article.category).label),
    sourceDistribution: createDistribution(
      articles,
      (article) => article.source?.title ?? article.source?.site_url ?? "알 수 없는 소스"
    ),
  };
}
