const NEXT_PATH_ORIGIN = "https://next-path.invalid";

/** Accept only same-origin, root-relative navigation targets from login flows. */
export function safeNextPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, NEXT_PATH_ORIGIN);
    if (url.origin !== NEXT_PATH_ORIGIN || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
