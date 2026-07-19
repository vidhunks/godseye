# static Asset Resolution Fix Report

This document reports the root cause, actions taken, and verification results for the 404 error on Vite-generated static assets (`/assets/index-*.js`, `/assets/index-*.css`) in the frontend deployment.

---

## 1. Root Cause

### The Problem
When the browser requested the CSS/JS files (e.g. `/assets/index-CMWXGcA3.js`), the requests were caught by the Nginx regex location blocks:
- `location ~* \.[a-f0-9]...\.(js|css|...)` (hashed assets)
- `location ~* \.(?:js|css|...)` (general assets)

### Why it returned 404
Neither of these location blocks contained a `root` directive, nor was there a global `root` directive declared at the `server` block level. 
When a location block lacks an explicit `root` declaration, Nginx defaults to its compile-time default root directory (typically `/etc/nginx/html` or similar), rather than `/usr/share/nginx/html` (where the built assets were placed in the Docker image). Since that default directory was empty, Nginx returned a **404 Not Found** for all assets matching those patterns.

---

## 2. Files Modified

- **[frontend/nginx.conf](file:///d:/001/godseye/frontend/nginx.conf)**
  Added the `root` directive inside the `server { ... }` block to ensure all locations inherit the correct base path `/usr/share/nginx/html`:
  ```nginx
  server {
      listen 80;
      server_name _;
      root /usr/share/nginx/html;
      ...
  }
  ```

---

## 3. Validation Results

### Assets Availability Check
Running native `curl.exe` tests against the active running Nginx container confirms that assets are successfully resolved and return **HTTP 200 OK**:

```
> curl.exe -I http://localhost:3000/assets/index-CMWXGcA3.js
HTTP/1.1 200 OK
Server: nginx/1.31.3
Content-Type: application/javascript
Content-Length: 203319
Cache-Control: public, max-age=604800

> curl.exe -I http://localhost:3000/assets/index-C-o4FVBu.css
HTTP/1.1 200 OK
Server: nginx/1.31.3
Content-Type: text/css
Content-Length: 7981
Cache-Control: public, max-age=604800
```
- Both JavaScript and CSS files return `200 OK`.
- Cache-Control headers match policy expectations.
- React starts up correctly, and the browser console remains clean of asset loading errors.
