import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    ignoreIssue: [
      {
        path: '**/*',
      }
    ]
  }
};

export default nextConfig;
