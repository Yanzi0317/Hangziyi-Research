import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: {
    "/api/recommend": [
      "./src/recommendation/**/*.md",
      "./data/market-snapshots/*.json",
    ],
    "/api/compare": [
      "./src/recommendation/**/*.md",
      "./data/market-snapshots/*.json",
      "./tests/personas/*.json",
    ],
    "/api/market": ["./data/market-snapshots/*.json"],
  },
};
export default config;
