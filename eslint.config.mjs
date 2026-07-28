import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // SEED Design CLI가 생성한 스니펫 — 우리가 작성한 코드가 아니라 앱 린트 규칙 대상에서 제외.
    "seed-design/**",
  ]),
]);

export default eslintConfig;
