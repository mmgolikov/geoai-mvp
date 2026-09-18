# Portable candidate: isolated local container receipt

Status: local synthetic runtime PASS; not live Auth, data-provider, cloud, VPS, DNS, or Production acceptance.

- Tested application commit: `e9c57a738db6d12c61bf0a3bcef80f404a1ce189` on `codex/sprint10-control-20260918`.
- Exact image: `geoai-self-host:e9c57a7-synthetic`, ID `sha256:d009e9261c4a74a99a0ff8efbb364a0b330e5dc7d2f4c53a875a0e7207789f11`, 116,001,982 bytes.
- Build: pinned Node 22.20.0 image in the repository Dockerfile; npm ci, compilation, types, and 81 routes PASS. Only tracked Git files and deliberately synthetic public settings entered the build. No real credential entered the image.
- Dedicated local VM: 4,095,627,264 bytes memory. The earlier 2 GB attempt at `8295e8d` exited 137 with `OOMKilled=true`; it is not a passing build. Its retained diagnostic container was not used as the accepted image. The local VM restart retained its disks and the separate stopped database fixture container.

## Actual runtime checks

Seven new isolated containers, all `network=none`, no published ports, read-only root filesystem, UID/GID `1001:1001`, dropped capabilities and no-new-privileges:

1. Valid synthetic configuration: `/api/health` 200 with the exact commit and `self_hosted_candidate` identity; unauthenticated product page 307 to `/login`; anonymous paid analysis route 401; repository security-header check PASS; stop/start and the same assertions PASS.
2. Changed public Mapbox configuration: exit 78 before readiness.
3. Missing runtime target: exit 78 before readiness.
4. Conflicting Vercel environment: exit 78 before readiness.
5. Public-demo Auth mode: exit 78 before readiness.
6. Paid AI enabled outside this first portable packet: exit 78 before readiness.
7. Privileged credential variable name: exit 78 before readiness, using a synthetic non-secret value.

All seven owned containers were stopped after verification and retained for diagnostics. No external network or provider call was possible in these containers. The sealed startup gate was exercised, not bypassed.

Pinned Caddy 2.10.2 configuration validation also passed in a separate network-isolated local container. This is configuration validation, **not** end-to-end proxy, TLS-certificate, canonical public-origin, or real login acceptance.

## Remaining gates

The self-host packet deliberately disables paid AI and cloud artifact persistence. This receipt does not imply feature parity with protected Vercel Preview. Fresh exact-head CI/browser evidence, real authenticated/provider scenarios, controlled proxy/TLS rehearsal, operational load measurements, external domain and sender setup remain separate gates. No infrastructure purchase, DNS change, Production deployment, or hosted configuration change occurred in this rehearsal.
