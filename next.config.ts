import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.mapbox.com https://*.tiles.mapbox.com https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests"
].join("; ");

const publicSourceRuntimeFiles = [
  "./data/external/normalized/external_data_manifest.json",
  "./data/normalized/dld_source_quality.json",
  "./data/normalized/osm_source_quality.json",
  "./data/normalized/overture_source_quality.json"
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Public source/readiness routes import only a bounded reviewed manifest plus
  // compact aggregate-quality metadata. Deep snapshots are reserved for the
  // operator plane. Dynamic context routes declare their one required file.
  outputFileTracingIncludes: {
    "/api/context/spatial": ["./data/normalized/overture_buildings_snapshot.json"],
    "/api/context/demographics": ["./data/normalized/worldpop_population_context.json"],
    "/api/context/satellite-availability": ["./data/external/samples/copernicus_sentinel_metadata_sample.json"],
    "/api/data-sources*": publicSourceRuntimeFiles,
    "/api/external-data/manifest": publicSourceRuntimeFiles,
    "/api/external-data/sources": publicSourceRuntimeFiles,
    "/api/external-data/status": publicSourceRuntimeFiles,
    "/api/source-lineage": publicSourceRuntimeFiles
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
        ]
      }
    ];
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/.git/**", "**/.next/**", "**/node_modules/**"]
    };

    return config;
  }
};

export default nextConfig;
