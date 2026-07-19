# Phase 2.2.1 - Frontend Recovery Report

## 1. Root Cause

The frontend regression was caused by the `location = /index.html` block in [frontend/nginx.conf](../frontend/nginx.conf). During Phase 2.2, the block was added only to attach a cache header, but it did not define `root /usr/share/nginx/html;`.

Because that location is an exact match, it overrides the normal SPA fallback path. When Nginx tried to serve `/` or `/index.html`, it resolved the file against its default document root instead of the frontend build directory, which produced a 404.

## 2. Evidence Collected

- `docker compose ps` showed the backend and Neo4j containers were healthy, while the frontend container was unhealthy.
- `docker compose logs frontend` showed Nginx returning `open() "/etc/nginx/html/index.html" failed (2: No such file or directory)` and HTTP 404 responses for `/` and `/index.html`.
- `curl http://localhost:3000` returned a 404 from Nginx.
- `curl http://localhost:3000/index.html` also returned a 404 from Nginx.
- `curl http://localhost:3000/api/database/ping` returned `200` and `{"message":"Neo4j Connected"}`, proving the API proxy still worked.
- `curl http://127.0.0.1:3000/index.html` inside the running container returned `404 Not Found` before the fix.
- The frontend container did contain the built React app at `/usr/share/nginx/html/index.html`, so the problem was not a missing build.
- Comparing the current nginx config to the pre-Phase 2.2 version showed that the new exact `location = /index.html` block was the only behavioral change affecting SPA document resolution.

## 3. Files Modified

- [frontend/nginx.conf](../frontend/nginx.conf)
- [docs/PHASE_2_2_1_FRONTEND_RECOVERY.md](../docs/PHASE_2_2_1_FRONTEND_RECOVERY.md)

## 4. Exact Fix Applied

The `location = /index.html` block was updated to include:

```nginx
root   /usr/share/nginx/html;
```

No other nginx behavior was changed.

## 5. Why the Fix Works

The exact `location = /index.html` block was intercepting the SPA fallback request and serving it without the correct document root. Adding the frontend build directory as the root for that exact location ensures Nginx resolves `/index.html` from the same static files that the `location /` block serves.

This preserves all intended behavior:

- the React SPA still loads at `/`
- SPA refresh and deep-link support still works through `try_files`
- `/api` still proxies to `backend:8000`
- the caching and security-header improvements from Phase 2.2 remain intact

## 6. Validation Results

After rebuilding the stack with Docker Compose:

- Backend: healthy
- Neo4j: healthy
- Frontend: served `200 OK` for `/`
- Frontend: served `200 OK` for `/index.html`
- API proxy: served `200 OK` for `/api/database/ping`

The frontend container is again serving the built React application over HTTP, and the backend API proxy remains functional.

## 7. Confirmation

The project is again fully functional over HTTP.

The backend, Neo4j, frontend SPA, and `/api` proxy all work together correctly, and no HTTPS changes were introduced.