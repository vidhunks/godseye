# Phase 2.2 - Production Nginx Preparation Report

## Files Modified

- [frontend/nginx.conf](../frontend/nginx.conf)

## Explanation of Every Nginx Improvement

- Replaced the localhost-only `server_name` with a production-friendly catch-all so the frontend can serve a future public domain without assuming local development.
- Added a Phase 3 comment indicating where HTTPS termination and redirects will be introduced later.
- Kept the existing gzip configuration intact so compression behavior remains the same.
- Added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers for safer default browser behavior over plain HTTP.
- Kept the SPA route fallback with `try_files` so refreshes and deep links continue to work.
- Kept `/api/` proxying to `backend:8000` unchanged so the application behavior stays the same.
- Added long-lived caching for hashed frontend assets while keeping `index.html` non-cacheable so new builds are picked up immediately.
- Added `X-Forwarded-Host` alongside the existing proxy headers so upstream request context is preserved more completely.

## Compatibility Concerns

- The config remains HTTP-only and does not introduce TLS or certificate references.
- `index.html` is intentionally not cached so deployments continue to update cleanly.
- Hashed asset caching assumes the production build emits fingerprinted filenames, which is consistent with the current Vite build output.
- Security headers are intentionally conservative and do not include HSTS because HTTPS is not enabled yet.

## Readiness for Phase 3 HTTPS

- The config is ready for a future HTTPS pass because the HTTP server is isolated and already uses proxy headers that will remain useful behind TLS.
- Phase 3 can add a `listen 443 ssl` block, certificate paths, and HTTP-to-HTTPS redirection without changing SPA routing or API proxy behavior.
- The current separation of `index.html` freshness and long-lived asset caching will continue to work after HTTPS is introduced.