/** @type {import('next').NextConfig} */
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  ...(isGitHubActions ? { basePath: "/aturkeuanganku" } : {}),
};

export default nextConfig;
