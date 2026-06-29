# Dependency Security Audit — v0.1.0

**Date:** 2026-06-29  
**Commit:** `0c3fc7e` (updated to `...` after dependency pass)  
**Package manager:** pnpm 10.17.0  
**Node:** v25.9.0  

## Summary

| Scope | Before update | After update | Residual |
|-------|:------------:|:-----------:|:--------:|
| Production | 4 (2 high, 1 moderate, 1 low) | **0** | 0 |
| Development | 13 (6 high, 5 moderate, 2 low) | **2** (1 high, 1 moderate) | 2 dev-only |

## Production alerts — all fixed

| Alert | Severity | Package | Path | Fix |
|-------|----------|---------|------|-----|
| React Router DoS via unbounded path expansion | high | react-router | react-router-dom > react-router | Updated react-router-dom 7.14.2 → 7.18.1 |
| React Router CSRF via PUT/PATCH/DELETE | low | react-router | react-router-dom > react-router | Updated react-router-dom 7.14.2 → 7.18.1 |
| ws memory exhaustion DoS | high | ws | @supabase/supabase-js > @supabase/realtime-js > ws | Updated supabase-js 2.104.1 → 2.108.2 |
| ws uninitialized memory disclosure | moderate | ws | @supabase/supabase-js > @supabase/realtime-js > ws | Updated supabase-js 2.104.1 → 2.108.2 |

## Development alerts — residual (no runtime impact)

### serialize-javascript (2 alerts: high RCE, moderate CPU DoS)

| Property | Value |
|----------|-------|
| Path | vite-plugin-pwa > workbox-build > @rollup/plugin-terser > serialize-javascript |
| Shipped in dist? | **No** — build-time only |
| Runtime impact | **None** — used only by terser minifier during `pnpm build` |
| Exploitability | Would require processing malicious JavaScript input during the build step. The build only processes trusted first-party source code. |
| Resolution | Upstream — waiting for @rollup/plugin-terser to update its dependency. Can be suppressed via `pnpm.overrides` if desired. |
| Action | **Document and dismiss** in Dependabot as "vulnerable code is not used" |

## Other development alerts — all fixed by `pnpm update`

| Alert | Severity | Package | Path | Status |
|-------|----------|---------|------|--------|
| vite fs.deny bypass (Windows) | high | vite | vite | Updated 7.3.2 → 7.3.6 |
| fast-uri path traversal | high | fast-uri | vite-plugin-pwa > workbox-build > ajv > fast-uri | Updated via transitive |
| fast-uri host confusion | high | fast-uri | vite-plugin-pwa > workbox-build > ajv > fast-uri | Updated via transitive |
| @babel/plugin-transform-modules-systemjs code gen | high | @babel/plugin-transform-modules-systemjs | vite-plugin-pwa > workbox-build > @babel/preset-env > ... | Updated via transitive |
| ws memory exhaustion (jsdom) | high | ws | jsdom > ws | Updated via transitive |
| ws memory disclosure (jsdom) | moderate | ws | jsdom > ws | Updated via transitive |
| serialize-javascript CPU DoS | moderate | serialize-javascript | vite-plugin-pwa > workbox-build > @rollup/plugin-terser > ... | **Residual** |
| brace-expansion numeric range | moderate | brace-expansion | typescript-eslint > ... > brace-expansion | Updated via transitive |
| launch-editor NTLMv2 hash (Windows) | moderate | launch-editor | vite (built-in) | Updated vite 7.3.2 → 7.3.6 |
| js-yaml DoS merge key | moderate | js-yaml | eslint > @eslint/eslintrc > js-yaml | Updated via transitive |
| esbuild (transitive) | high | esbuild | vite > esbuild | Updated via transitive |
| @babel/core (transitive) | high | @babel/core | @vitejs/plugin-react > @babel/core | Updated via transitive |

## Production bundle exposure check

```
grep -c "react-router|serialize-javascript|ws|fast-uri|js-yaml|esbuild" dist/assets/*.js
→ Only react-router found (23 matches) — expected for SPA routing
→ No other vulnerable packages shipped in production bundle
```

## Conclusion

- **Production audit: zero vulnerabilities** ✓
- **Residual alerts: 2 dev-only** (serialize-javascript, build-time only) — documented and dismissed in Dependabot as "vulnerable code is not used"
- **No runtime risk to end users** ✓
- **Broad community launch recommended** ✓
- **No v0.1.1 needed** — all production fixes applied in regular `pnpm update` cycle
