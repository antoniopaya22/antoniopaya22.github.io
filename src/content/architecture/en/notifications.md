---
title: "Multichannel notifications"
short: "Notifications"
summary: "One service decides what to notify, to whom and through which channel (email, SMS, push or in-app), honouring preferences and opt-outs, with retries, deduplication and control over domain reputation."
description: "Email, SMS, push and in-app notices with preferences, templates, retries and SPF/DKIM/DMARC: a reference architecture on AWS, Azure, GCP and on-premises."
order: 26
requirements:
  - "Business services publish notification intents; none of them calls an email or SMS provider directly."
  - "Every send honours the recipient's preferences, language and opt-out, and an opt-out applies to every channel it should."
  - "A notice is never delivered twice, even if the message is retried or published twice."
  - "Bounces and complaints flow back into the system and suppress the affected address or number."
  - "The sending domain is authenticated with SPF, DKIM and DMARC, and marketing mail is kept apart from transactional mail."
platforms:
  onprem:
    summary: "RabbitMQ as the queue, workers on Kubernetes as the router, PostgreSQL for preferences and templates, Postfix as the MTA, and the FCM, APNs and carrier SMS APIs for the other channels."
    notes:
      - "Postfix sending straight from your own IPs needs correct PTR records, clean IP reputation and gradual warm-up; many organisations use it only as a relay to an external provider that already has that reputation."
      - "Push cannot be fully self-hosted: Android goes through FCM and iOS through APNs, so you need outbound Internet access to Google and Apple even if everything else stays in your data centre."
      - "For SMS, contract a carrier or aggregator API that handles alphanumeric sender IDs and delivery in your target countries, with delivery reports via webhook."
      - "In development, Mailpit catches all SMTP traffic behind a web UI: nobody emails a real customer from a laptop."
      - "The cost is operations: queues, workers and, above all, watching blocklists and the reputation of your IPs."
  aws:
    summary: "SQS as the queue, Lambda as the router, Aurora PostgreSQL for preferences, Amazon SES for email, AWS End User Messaging SMS, and SNS mobile push towards FCM and APNs."
    notes:
      - "SES starts in the sandbox: you request production access, and the daily and per-second sending quotas grow with account history. Enforce the maximum rate in the router instead of relying on throttling errors."
      - "Publish SES bounces and complaints (configuration set to SNS or EventBridge) and feed your own suppression table as well as the SES suppression list."
      - "Amazon Pinpoint reached end of support in October 2026; SMS, voice and push live on under AWS End User Messaging. Do not start anything on Pinpoint."
      - "If you send on behalf of several customers, SES tenant management isolates reputation per customer and keeps per-tenant suppression lists."
      - "SES charges per message and per attachment volume; SMS is charged per message by destination country and is usually by far the most expensive channel."
  azure:
    summary: "Service Bus as the queue, Azure Functions as the router, PostgreSQL for preferences and Notification Hubs for push; ACS Email and ACS SMS, shown in the diagram, are being retired and should be replaced with a Marketplace provider."
    notes:
      - "In September 2026 Microsoft announced the retirement of Azure Communication Services as a standalone offering on 30 September 2028, Email and SMS included. Since 23 October 2026 new customers cannot buy numbers for SMS."
      - "For a new project, use a CPaaS from the Marketplace (Microsoft points to Infobip, Telesign or Blip) or SendGrid or Mailgun for email; Microsoft 365 High Volume Email only covers internal sending within your own tenant."
      - "If you already run ACS, hide the provider behind an adapter in the router: the migration then means swapping one module, not touching every sending service."
      - "Notification Hubs delivers to FCM (HTTP v1 API) and APNs and supports tag-based targeting; the Free tier has no SLA."
      - "Service Bus Standard is billed per operation; Premium per messaging unit per hour, with isolation and private networking."
  gcp:
    summary: "Pub/Sub as the queue, Cloud Run functions as the router, Cloud SQL for preferences and Firebase Cloud Messaging for push; Google Cloud has no email or SMS service of its own, so you contract SendGrid, Mailgun, Mailjet or Twilio."
    notes:
      - "Google's documentation points to SendGrid, Mailgun or Mailjet for email and Twilio for SMS; these are third-party contracts outside Google's SLA."
      - "SendGrid retired its permanent free plan in 2025: new accounts start on a time-limited trial."
      - "Compute Engine blocks outbound traffic on port 25: send through the provider's HTTP API or SMTP on port 587."
      - "FCM is free and uses the HTTP v1 API with service-account credentials; the legacy API is gone."
      - "Pub/Sub delivers at least once by default: deduplication by idempotency key is the router's job."
tiers:
  - name: "Minimum viable"
    when: "A product sending transactional email (sign-up, password reset, invoices) and perhaps push, run by a small team."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: the API enqueues in PostgreSQL or Valkey, a worker sends over SMTP to an external relay, and Mailpit replaces the relay in development."
    aws: "SES with a verified domain and DKIM, one SQS queue with a dead-letter queue and one Lambda; preferences live in the application database."
    azure: "Service Bus Standard, one Function and an email provider from the Marketplace; Notification Hubs if there is a mobile app."
    gcp: "Pub/Sub, one Cloud Run function, an email provider via API and FCM for push."
    tradeoffs: "No SMS and no full preference centre; deduplication and bounce suppression are basic and reputation rests on a single domain."
  - name: "Multichannel with preferences"
    when: "A SaaS with thousands of users that needs email, SMS, push and in-app notices with per-category opt-outs and several languages."
    cost: 2
    ops: 2
    onprem: "Kubernetes with RabbitMQ, per-channel workers scaled by KEDA, PostgreSQL holding preferences and versioned templates, and Postfix relaying to a provider."
    aws: "One SQS queue per channel, Lambda with capped concurrency to stay under the SES quota, End User Messaging SMS, SNS mobile push and SES events to EventBridge."
    azure: "Service Bus with one queue per channel, Functions, Notification Hubs Basic or Standard and a Marketplace CPaaS for email and SMS."
    gcp: "One Pub/Sub topic per channel, Cloud Run functions, Cloud SQL, FCM and external email and SMS providers with delivery webhooks."
    tradeoffs: "More moving parts and more provider contracts; SMS blows up the bill unless it is restricted to what is critical."
  - name: "High volume, many senders"
    when: "A platform sending millions of messages or sending on behalf of many customers, with marketing and transactional traffic separated."
    cost: 4
    ops: 3
    onprem: "Several MTA instances with dedicated, warmed-up IPs, queues split by priority and customer, and a reputation dashboard fed by DMARC reports."
    aws: "SES with dedicated or managed IPs, tenant management with per-tenant suppression and Virtual Deliverability Manager; separate queues for transactional and marketing."
    azure: "A high-volume Marketplace CPaaS with sub-accounts per customer, Service Bus Premium and Functions on a dedicated plan or Container Apps."
    gcp: "A provider with dedicated IPs and sub-accounts, Pub/Sub topics by priority and the router on Cloud Run with minimum instances."
    tradeoffs: "Dedicated IPs need steady volume to keep their reputation; deliverability operations become a job in their own right."
extensions:
  - name: "Real-time in-app notices"
    when: "When users must see the notice instantly without reloading and without relying on push."
    cost: "low"
    onprem: "SSE from the API + Valkey pub/sub"
    aws: "API Gateway WebSocket or AppSync Events"
    azure: "Azure Web PubSub"
    gcp: "SSE on Cloud Run"
  - name: "Digests and quiet hours"
    when: "When many small notices annoy more than they inform: group them and send a digest."
    cost: "low"
    onprem: "Kubernetes CronJob"
    aws: "EventBridge Scheduler"
    azure: "Functions timer trigger"
    gcp: "Cloud Scheduler"
  - name: "Bounce and complaint intake"
    when: "Whenever you send email at volume: without automatic suppression reputation drops within days."
    cost: "low"
    onprem: "Bounce mailbox + VERP parser"
    aws: "SES events to EventBridge"
    azure: "Provider webhooks to Functions"
    gcp: "Provider webhooks to Cloud Run"
  - name: "DMARC reporting"
    when: "When moving DMARC from p=none to quarantine or reject, to learn who sends on your behalf."
    cost: "low"
    onprem: "parsedmarc + OpenSearch"
    aws: "DMARC reporting service (SaaS)"
    azure: "DMARC reporting service (SaaS)"
    gcp: "DMARC reporting service (SaaS)"
  - name: "WhatsApp messaging"
    when: "When end users respond better on WhatsApp than SMS and the use case is allowed."
    cost: "medium"
    onprem: "WhatsApp Business Platform (API)"
    aws: "End User Messaging Social"
    azure: "Marketplace CPaaS"
    gcp: "WhatsApp Business Platform (API)"
  - name: "Priority queue"
    when: "When a bulk campaign must not delay a verification code or a security alert."
    cost: "low"
    onprem: "RabbitMQ priority queues"
    aws: "Separate SQS queues"
    azure: "Separate Service Bus queues"
    gcp: "Separate Pub/Sub topics"
savings:
  - "Restrict SMS to what truly needs it (one-time codes, critical alerts) and offer push or email instead: SMS is charged per message and per country and easily costs more than every other channel combined."
  - "Batch notices into hourly or daily digests: fewer messages, fewer complaints and lower per-message spend with every provider."
  - "Keep lists clean: suppressing addresses that bounce avoids paying for useless sends and protects the reputation that lets you keep sending."
  - "Stay on the provider's shared IPs until you have steady volume; dedicated IPs carry a fixed cost and must be warmed up and kept busy."
  - "In development and staging, point SMTP at Mailpit and SMS at a simulator: no cost and no accidental messages to real customers."
  - "Use SQS or Service Bus Standard queues and functions that scale to zero: a notification system spends most of the day nearly idle."
---

## When you need it

As soon as a product sends anything beyond the password-reset email. Order confirmations, security alerts, reminders, 'your report is ready': each team ends up wiring its own email provider, with its own templates, ignoring opt-outs and with no record of what went to whom. Users get three emails for the same event and the domain lands in the spam folder. This case centralises the decision of what to notify and through which channel in one service with preferences, templates, retries and traceability.

## Scenarios

### Startup with a single channel

Transactional email and nothing else. A managed provider (SES or an API-based provider), a domain with SPF, DKIM and DMARC from day one, and a queue with a dead-letter queue. You do not need a separate service yet, but you do need the interface: 'publish a notification intent', not 'call SES'. When the second channel arrives, only the consumer changes.

### B2B SaaS with per-category preferences

Customers want to mute billing notices but not security ones, in their language and with nothing between 22:00 and 08:00. This brings in the preferences table by user, category and channel, templates versioned per language, and the quiet-hours and digest logic. Mandatory categories (security, legal) cannot be switched off, and that is modelled explicitly.

### Sending on behalf of customers

A platform that emails its customers' customers inherits everyone's reputation. Separate senders per customer (subdomains or SES tenants), suppress per tenant, and cut off anyone whose complaint rate climbs before they drag the others down. Gmail stops applying mitigations to bulk senders above a 0.3% user-reported spam rate, and requires DMARC and one-click unsubscribe (RFC 8058) on marketing mail.

### Public body on-premises

The MTA is your own and data stays in the data centre, except what cannot: push goes through FCM and APNs, and SMS through a carrier. Document those flows in the risk analysis and keep personal data out of the push payload; send a generic notice and let the app fetch the detail once authenticated.

## How it fits together

Sending services (orders, accounts, alerts) publish a message to the queue with the recipient, the notice type, the template data and an idempotency key. They know nothing about channels or providers.

The router consumes the queue. For each message it reads preferences and templates: which channels the user has enabled for that category, whether they opted out, which language and time zone they use and whether quiet hours apply. It checks the idempotency key against a sends table (a unique constraint is enough) so a notice already sent is not repeated. Then it renders the template and hands off to each channel: email, SMS, push and in-app, which is simply a row in a table that the UI reads and that is pushed to the browser over SSE when the user is online.

Every send leaves a record with its status. Transient provider errors are retried with exponential backoff and, after several failures, the message moves to the dead-letter queue. Feedback events (delivered, bounced, complaint, STOP opt-out) arrive via webhook or the provider's event bus and update suppression. An address with a hard bounce receives nothing more without someone stepping in.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** RabbitMQ (or a queue table in PostgreSQL with `SKIP LOCKED` if volume is low), a router container with several workers, PostgreSQL with a volume and backups, and Postfix configured as an authenticated relay to a provider. Mailpit goes in the development `compose.override.yml`. The reverse proxy exposes only the preferences API and the delivery-webhook endpoint.

**Kubernetes on-premises.** k3s or RKE2 with the RabbitMQ Cluster Operator, CloudNativePG for the database, one Deployment per channel scaled by KEDA on queue length, and cert-manager for webhook TLS. Splitting workers per channel lets you cap SMS concurrency without slowing email.

**Cloud without Kubernetes.** This is the diagram's design: SQS with Lambda, Service Bus with Functions or Pub/Sub with Cloud Run functions. Cap function concurrency so you never exceed the provider's sending quota, and use native dead-letter queues.

**Managed Kubernetes.** EKS, AKS or GKE make sense if the rest of the platform already lives there; the router is one more Deployment with KEDA reading the managed queue. It does not justify a cluster on its own.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Manual | Low volume, on-premises |
| Kubernetes on-premises | Three or more nodes | High | KEDA on queue | Several channels, no cloud |
| Managed functions and queues | Near zero | Low | Automatic | Default choice in the cloud |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | KEDA and nodes | Existing platform |

## Key decisions

- **Build or buy the orchestration.** Your own router is a few hundred lines and gives you full control; platforms such as Novu (open source) or notification SaaS products add a preference centre and templates at the cost of another dependency.
- **One domain or subdomains per type.** Separating `notify.example.com` from `marketing.example.com` isolates reputation: a campaign that draws complaints does not block password emails.
- **Cloud provider or independent provider.** SES is cheap and integrated; an independent provider is portable across clouds and, on Azure, is now the recommended route after the ACS retirement.
- **Idempotency in the router, not the queue.** No queue guarantees exactly-once end to end; an idempotency key and a unique constraint on the sends table do.
- **Personal data in the message.** Push and SMS travel through third parties and show on the lock screen: send the minimum and keep the detail behind authentication.

## Common pitfalls

- Sending from every microservice with its own provider key: no shared preferences, no suppression, no record.
- Publishing DMARC with `p=reject` before reviewing the reports: legitimate mail from other systems disappears.
- Ignoring bounces and complaints until the provider suspends the account.
- Retrying an SMS that fails on an invalid number forever: every attempt is billed.
- Using alphanumeric sender IDs without offering another way to opt out: they cannot receive replies or STOP.
- Testing with real addresses in staging and sending a thousand emails to customers from a test environment.
- Templates without versions or a default language: the first user with an unexpected locale gets an empty email.
