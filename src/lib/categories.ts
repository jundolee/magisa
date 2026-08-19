export const CATEGORIES = [
  { id: "all", label: "전체", badgeTone: "neutral" as const },
  { id: "frontend", label: "Frontend", badgeTone: "brand" as const },
  { id: "backend", label: "Backend", badgeTone: "informative" as const },
  { id: "ai_ml", label: "AI / ML", badgeTone: "positive" as const },
  { id: "devops", label: "DevOps", badgeTone: "warning" as const },
  { id: "mobile", label: "Mobile", badgeTone: "critical" as const },
  { id: "data", label: "Data", badgeTone: "informative" as const },
  { id: "culture", label: "Culture", badgeTone: "neutral" as const },
  { id: "general", label: "General", badgeTone: "neutral" as const },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ArticleCategory = Exclude<CategoryId, "all">;

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategoryMeta(categoryId: string | null | undefined) {
  if (!categoryId) return CATEGORY_MAP.get("general")!;
  return CATEGORY_MAP.get(categoryId as CategoryId) ?? CATEGORY_MAP.get("general")!;
}
