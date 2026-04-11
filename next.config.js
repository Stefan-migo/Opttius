// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow build to complete; fix ESLint issues separately
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Suppress Sentry warnings during build (global-error.tsx is present)
  env: {
    SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING: "1",
  },
  experimental: {
    // typedRoutes: true, // Temporarily disabled
    // Externalize packages that use native binaries
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
    // Exclude large files from serverless bundles (250MB limit on Vercel)
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@xenova/**',
        'node_modules/onnxruntime-node/**',
        'node_modules/@huggingface/**',
        '.next/cache/**',
        '.git/**',
        '.qoder/**',
        'node_modules/.cache/**',
      ],
      // Chat route pulls in heavy AI deps - exclude build artifacts
      '/api/admin/chat': [
        '.next/cache/**',
        '.git/**',
        '.qoder/**',
        'node_modules/.cache/**',
      ],
    },
  },
  // Webpack configuration to handle native modules
  webpack: (config, { isServer }) => {
    // Exclude native node modules from bundling
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@xenova/transformers': 'commonjs @xenova/transformers',
        'onnxruntime-node': 'commonjs onnxruntime-node',
      });
    }

    // Ignore native .node files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      // POS config moved to Sistema > Boletas y Facturas
      { source: '/admin/pos/settings', destination: '/admin/system?tab=billing', permanent: false },
    ];
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Get Supabase URL for CSP
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseDomain = supabaseUrl
      ? new URL(supabaseUrl).origin
      : 'https://*.supabase.co';

    // Build Content Security Policy
    const cspParts = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com https://www.google.com https://www.googletagmanager.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:",
      `img-src 'self' data: https: blob: ${supabaseDomain !== 'https://*.supabase.co' ? supabaseDomain : 'https://*.supabase.co'}`,
      `connect-src 'self' https: wss: ws: ${supabaseDomain !== 'https://*.supabase.co' ? supabaseDomain : 'https://*.supabase.co'} https://*.supabase.co${supabaseUrl.includes('127.0.0.1') ? ' ws://127.0.0.1:54321' : ''}`,
      `frame-src 'self' https://www.mercadopago.com https://www.mercadolibre.com https://http2.mlstatic.com https://secure-fields.mercadopago.com https://www.google.com ${supabaseDomain !== 'https://*.supabase.co' ? supabaseDomain : 'https://*.supabase.co'}`,
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ];

    // Add upgrade-insecure-requests in production
    if (isProduction) {
      cspParts.push("upgrade-insecure-requests");
    }

    const csp = cspParts.join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(), encrypted-media=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          // HSTS only in production
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
        ],
      },
    ];
  },
};

// Only wrap with Sentry when DSN + auth token are configured (avoids build failures on Vercel when not set up)
const useSentry =
  process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN;

const sentryOptions = useSentry
  ? {
      silent: true,
      org: process.env.SENTRY_ORG || "your-org-slug",
      project: process.env.SENTRY_PROJECT || "opttius",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }
  : undefined;

const sentryBuildOptions = useSentry
  ? {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    }
  : undefined;

module.exports =
  sentryOptions && sentryBuildOptions
    ? withSentryConfig(nextConfig, sentryOptions, sentryBuildOptions)
    : nextConfig; 