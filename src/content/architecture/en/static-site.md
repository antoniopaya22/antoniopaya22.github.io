---
title: "Static sites and Jamstack"
short: "Static site"
summary: "Websites, docs and landing pages generated at build time and served from a CDN, with a little edge logic and one function for forms: the cheapest and lowest-maintenance case in the whole catalogue."
description: "Static or Jamstack site with SSG, CDN, edge logic, form functions and per-PR previews: a reference architecture on AWS, Azure, GCP and on-premises."
order: 22
requirements:
  - "All HTML is generated at build time; no code runs per request except at the edge and in the forms."
  - "The origin is private: only the CDN can read the files."
  - "Every deployment is atomic and can be rolled back by republishing the previous version."
  - "Hashed assets are cached for a long time and HTML is revalidated on every deployment."
  - "Forms validate server-side, are protected against bots and expose no secrets to the client."
platforms:
  onprem:
    summary: "Caddy terminates TLS with ACME certificates and serves and caches files from disk, PowerDNS resolves and a small container handles forms; Coolify packages the whole thing."
    notes:
      - "For static files on disk Caddy is enough: Varnish only helps in front of a slow or dynamic origin."
      - "Your own server is not a CDN: if visitors are spread around the world, put an external CDN in front and keep the server as origin."
      - "Publish each version to a new directory and switch a symlink: deployment is atomic and rollback means pointing back to the previous one."
      - "The cost is the host and its upkeep; outbound bandwidth from your connectivity provider is usually the real limit."
  aws:
    summary: "CloudFront with Origin Access Control in front of a private S3 bucket, CloudFront Functions for redirects and headers, Route 53 and ACM, and Lambda for forms; Amplify Hosting as the all-in-one alternative."
    notes:
      - "CloudFront flat-rate pricing plans (since November 2025) bundle CDN, WAF, Route 53 DNS, certificate and CloudFront Functions for a fixed monthly fee with no overages; the Free plan covers a small site."
      - "The ACM certificate for CloudFront must live in `us-east-1`, even if the bucket is in Europe."
      - "CloudFront Functions handles rewrites, redirects and security headers; use Lambda@Edge only when you need network access or longer execution, and it is billed separately per invocation."
      - "Route `/api/*` to a Lambda function URL protected with OAC: same domain, no CORS and no API Gateway."
      - "Amplify Hosting charges per build minute, storage and GB served; the Amplify WAF integration has a fixed charge per app."
  azure:
    summary: "Front Door serves a Storage static website, with its rules engine for redirects, Azure DNS and a managed certificate, and Azure Functions for forms; Static Web Apps is the all-in-one and cheapest alternative."
    notes:
      - "Front Door Standard and Premium carry an hourly base fee: for a small site it costs more than everything else combined. Static Web Apps includes CDN, certificates and managed functions without that fixed charge."
      - "Static Web Apps Free has no SLA and stops serving the site once the included bandwidth is used up; for production, use the Standard plan."
      - "Static Web Apps creates a staging environment per pull request (more on Standard than on Free) and removes it when the PR closes."
      - "Front Door Standard supports only custom WAF rules; managed rule sets require Premium. Edge Actions runs JavaScript at the edge when the rules engine is not enough."
  gcp:
    summary: "An external Application Load Balancer with Cloud CDN serves a Cloud Storage bucket, with Service Extensions for edge logic, Cloud DNS and Certificate Manager, and Cloud Run functions for forms; Firebase Hosting is the all-in-one alternative."
    notes:
      - "Cloud CDN does not exist without the external Application Load Balancer, which charges per forwarding rule on top of cache egress: for a small site, Firebase Hosting is much cheaper."
      - "Service Extensions plugins are WebAssembly modules running on the load balancer; for redirects and headers, the load balancer's own route rules are enough."
      - "Firebase Hosting provides CDN, certificates, preview channels and rewrites to Cloud Run or functions without configuring a load balancer."
      - "Firebase's free Spark plan disables the site once the monthly transfer allowance is exceeded; with real traffic, move to Blaze with budget alerts."
tiers:
  - name: "Free"
    when: "Personal site, project documentation or landing page with modest traffic and no SLA."
    cost: 1
    ops: 1
    estimate: "≈ €0/month plus the domain, within the free plans (list prices, Nov 2026, indicative)"
    onprem: "A VPS with Caddy serving the directory produced by CI; forms run in a small container on the same host."
    aws: "Private S3 with CloudFront on the Free flat-rate plan, Route 53 and a Lambda function URL for the form."
    azure: "Static Web Apps Free with managed functions for the form and a custom domain."
    gcp: "Firebase Hosting on the Spark plan, with a preview channel per pull request."
    tradeoffs: "No SLA or support, and free plans cut off service when the quota runs out instead of billing the excess."
  - name: "Production"
    when: "Corporate or product site with an SLA, custom domain, WAF and per-PR previews."
    cost: 2
    ops: 1
    onprem: "Two hosts with Caddy behind an external CDN, atomic symlink deployments and synthetic monitoring."
    aws: "CloudFront on the Pro plan with WAF and CloudFront Functions, versioned S3 and preview environments from CI or Amplify Hosting."
    azure: "Static Web Apps Standard with SLA, custom authentication and staging environments per PR."
    gcp: "Firebase Hosting on Blaze with budget alerts, or the load balancer with Cloud CDN and Cloud Armor if you already run it."
    tradeoffs: "A small fixed monthly cost appears in exchange for SLA and WAF; the origin is still a single region."
  - name: "High scale, multi-origin"
    when: "High-traffic site, campaigns with huge peaks or origin availability requirements."
    cost: 3
    ops: 2
    onprem: "Commercial CDN in front of two origins in different sites, with health-checked DNS."
    aws: "CloudFront on the Business or Premium plan with an S3 origin group in two regions, WAF with bot management and Origin Shield."
    azure: "Front Door Premium with managed WAF, Private Link to Storage and origins in two regions."
    gcp: "Global load balancer with Cloud CDN, Cloud Armor and backend buckets in two regions."
    tradeoffs: "More moving parts and a meaningful fixed fee; what usually justifies it is WAF and bot protection, not bandwidth."
extensions:
  - name: "WAF and per-IP rate limiting"
    when: "When the form gets spam or the site suffers aggressive scraping."
    cost: "low"
    onprem: "Coraza in Caddy"
    aws: "AWS WAF (included in flat-rate)"
    azure: "Front Door WAF"
    gcp: "Cloud Armor"
  - name: "Bot protection on forms"
    when: "Whenever there is a public form."
    cost: "low"
    onprem: "Self-hosted captcha (ALTCHA, mCaptcha)"
    aws: "AWS WAF CAPTCHA or Challenge"
    azure: "Front Door WAF CAPTCHA"
    gcp: "reCAPTCHA"
  - name: "Per-pull-request previews"
    when: "When non-technical reviewers must see changes before they go live."
    cost: "low"
    onprem: "Coolify (preview deployments)"
    aws: "Amplify Hosting (web previews)"
    azure: "Static Web Apps (staging)"
    gcp: "Firebase Hosting (preview channels)"
  - name: "Authentication at the edge"
    when: "Internal documentation or a private area without building a backend."
    cost: "low"
    onprem: "oauth2-proxy"
    aws: "Lambda@Edge with Cognito"
    azure: "Static Web Apps authentication"
    gcp: "IAP (site served from Cloud Run)"
  - name: "Site search"
    when: "Documentation with hundreds of pages."
    cost: "low"
    onprem: "Pagefind (static index)"
    aws: "Pagefind (static index)"
    azure: "Pagefind (static index)"
    gcp: "Pagefind (static index)"
  - name: "Optimised images"
    when: "When images make up most of the bytes served."
    cost: "medium"
    onprem: "imgproxy"
    aws: "Build-time optimisation + CloudFront"
    azure: "Build-time optimisation + Front Door"
    gcp: "Build-time optimisation + Cloud CDN"
savings:
  - "Start on the free plan of an all-in-one platform (Static Web Apps Free, Firebase Spark, Amplify Hosting) or CloudFront's Free flat-rate plan: for a small site the bill is zero or close to it."
  - "On Azure, don't put Front Door in front of a small site: its hourly base fee exceeds everything else; Static Web Apps already distributes content globally."
  - "On Google Cloud, Cloud CDN means paying for the load balancer; unless you need Cloud Armor or the load balancer for something else, Firebase Hosting is cheaper."
  - "Name assets with content hashes and cache them for a year with `immutable`; only HTML gets revalidated, the hit ratio goes up and you rarely need invalidations."
  - "Optimise images at build time (AVIF or WebP, responsive sizes) instead of transforming them per request: bandwidth is the line item that grows."
  - "Use CloudFront Functions or CDN rules for redirects and headers rather than Lambda@Edge or functions: cheaper per request and, on a flat-rate plan, included."
---

## When you need it

When content changes on publish, not on every visit: a company website, product documentation, a blog, a campaign landing page or a professional's personal site. A static site generator (Astro, Hugo, Eleventy, Next in export mode) produces HTML, CSS and JS in CI, and the CDN serves them with no application servers behind. It is the design with the smallest attack surface, the least operations and the lowest bill there is; many applications running on a server today could be this plus a couple of functions.

If every page depends on the user (dashboards, carts, personalised content), this is not your case: that is [Frontend, backend and database](/en/architecture/web-app/), although you can reuse the CDN and static origin for the SPA.

## Scenarios

### A freelancer's site or an open source project

The free plan of an all-in-one platform, a custom domain and the contact form in a function. There is nothing to operate; the risk is the free plan's quota, which cuts off service instead of billing. Set up alerts and know which plan you would move to.

### Corporate site with a marketing team

Content is edited by non-technical people: a headless CMS (Strapi, Directus, Payload or a SaaS one) fires a webhook that triggers the build. Per-PR previews are essential so marketing can review before publishing. The WAF and form bot protection pay for themselves with the first spam wave.

### Campaign with huge peaks

A TV advert or an IPO multiplies traffic a thousandfold for an hour. The static part holds up unchanged if everything is cached; what breaks is the form or the minimal API. Put a queue between the function and its destination, limit concurrency and load-test beforehand. On a CloudFront flat-rate plan the peak doesn't inflate the bill.

### Public body with EU data or an on-premises requirement

A global CDN serves from nodes worldwide; for public content that is rarely an issue, but edge logs contain IP addresses. Check where they are stored and for how long. If the client requires on-premises, a pair of hosts with Caddy and symlink deployments is enough; an external CDN is optional and can be restricted to European nodes with several providers.

## How it fits together

The CI build generates the site and publishes it to the origin storage: hashed assets first, then HTML, so no page ever points to a file that does not exist yet. The visitor resolves the domain in DNS, which points to the CDN; the platform itself issues and renews the certificate.

The CDN terminates TLS and answers from cache. Before that, edge logic applies redirects, path rewrites (`/blog/` to `/blog/index.html`), security headers (CSP, HSTS) and, when needed, language selection or A/B tests. On a cache miss the CDN reads the origin, which is private and accepts only the CDN. Requests to `/api` go to the function that processes the form: it validates, checks the bot challenge and sends the email or stores the submission.

The all-in-one alternative (Amplify Hosting, Static Web Apps, Firebase Hosting, Coolify) bundles build, CDN, certificates, previews and functions into one service. Outside the three clouds, Cloudflare (Workers with static assets, or Pages) and Netlify play the same role and are a sensible choice when the site doesn't need to live in your cloud account.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** A Caddy container with the site directory mounted read-only, another for the form function and, optionally, Coolify to manage builds and previews. Backups are trivial: the site is rebuilt from Git; you only need to keep the configuration and the form's secrets.

**On-premises Kubernetes.** Only if you already have a cluster: an Nginx or Caddy image with the site baked in, an Ingress or Gateway with cert-manager and the form as a small Deployment. Building a cluster for a static site is over-engineering.

**Cloud without Kubernetes.** The natural choice: storage plus CDN, or the all-in-one platform, with the form in a function. Nothing to scale or patch.

**Managed Kubernetes.** Not worth it for serving static files; at most, the form can live in the cluster if one already exists.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One VPS | Low | Vertical | On-premises or sovereignty |
| On-premises Kubernetes | Existing cluster | Medium | HPA | Only if the cluster exists |
| Storage + CDN or all-in-one | Zero or a small fee | Near zero | Automatic at the CDN | Default choice |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA | Not recommended here |

## Key decisions

- **All-in-one or separate pieces.** Static Web Apps, Firebase Hosting or Amplify give previews and functions with no configuration; storage plus CDN gives fine control over caching, WAF and multiple origins. Start with the former and move when a specific requirement demands it.
- **What goes at the edge.** Redirects, headers and language, yes; business logic, no. Edge functions have strict time and size limits and are harder to debug than a normal function.
- **Invalidate or version.** With hashed assets only HTML changes; invalidate HTML (or give it a short TTL) on each deployment and don't invalidate `/*` out of habit.
- **Your own form handler or a service.** A twenty-line function with bot protection is enough; an external form service saves code but sends your users' data to a third party.
- **Your cloud's CDN or an independent one.** If the rest of your system lives in one cloud, its CDN simplifies permissions and billing; if not, Cloudflare or Netlify are often cheaper and simpler.

## Common pitfalls

- Leaving the bucket or storage account public as well as the CDN: requests bypass caching, the WAF and the headers.
- Caching HTML for days without invalidating on deploy: users get the old version pointing at assets that no longer exist.
- Uploading HTML before the hashed assets, or deleting old assets in the same deployment: broken pages for minutes.
- Putting the email service key in client-side JavaScript to 'avoid needing a backend'.
- Choosing Front Door, or Cloud CDN with a load balancer, for a ten-page site and finding that the fixed fee is the only thing you pay.
- Forgetting that the free plan stops serving once you exceed the quota: on the day of the peak.
- Not configuring the 404 page and path rewrites, so URLs without a trailing slash return errors.
