import type { NextConfig } from "next";

/** GitHub 專案頁係 /repo 名。用戶頁 username.github.io 就留空。 */
function pagesBase(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

const basePath = pagesBase();

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
