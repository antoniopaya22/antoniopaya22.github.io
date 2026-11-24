---
title: "Real time with WebSockets"
short: "Real time"
summary: "Chat, presence, collaboration, live scores or self-updating dashboards: persistent connections with thousands of clients, message fan-out across instances and push notifications when the user is offline."
description: "Real time with WebSockets, presence, fan-out, reconnection and mobile push, or SSE as the simpler option: a reference on AWS, Azure, GCP and on-premises."
order: 23
requirements:
  - "A published message reaches every subscribed client, whichever instance it is connected to."
  - "The client reconnects on its own and recovers whatever it missed while disconnected."
  - "Connections are authenticated when opened and authorised per channel or room."
  - "History lives in a database: the connection is ephemeral and never the source of truth."
  - "If the user is not connected, important notices reach them by push."
platforms:
  onprem:
    summary: "Centrifugo (or Socket.IO with its Redis adapter) holds the connections, Valkey fans messages out across nodes and stores presence, NATS carries domain events, PostgreSQL the history and FCM and APNs the push."
    notes:
      - "Centrifugo is a standalone real-time server with channels, presence, history and recovery after reconnection; your backend just publishes through its API. Socket.IO means writing and scaling the server yourself."
      - "There is no shortcut for native mobile apps: push always goes through APNs and FCM. ntfy is for its own app and web push; for your app, a server such as Gorush talks to APNs and FCM."
      - "The reverse proxy needs long timeouts and `Upgrade` support; a deployment that drops connections triggers a reconnection storm."
      - "The cost is memory per connection and outbound bandwidth; size for concurrent connections, not requests."
  aws:
    summary: "API Gateway WebSocket holds the connections and invokes Lambda per route, DynamoDB stores connection IDs, history and state, EventBridge distributes events and SNS sends mobile push."
    notes:
      - "Each connection lasts at most 2 hours and closes after 10 idle minutes; the client must send heartbeats and reconnect. Messages can be up to 128 KB in 32 KB frames."
      - "There is no native broadcast: to send to a room, Lambda looks up the connections in DynamoDB and calls `@connections` once per client. For heavy fan-out, AWS AppSync Events offers channels with managed broadcast."
      - "You pay per message (in 32 KB blocks) and per connection minute; the rate of new connections per second has a per-account, per-Region quota that can be raised."
      - "SNS mobile push sends to APNs, FCM and others with per-device endpoints; AWS End User Messaging Push (the push part of Pinpoint) is the alternative, as Pinpoint's campaign features ended in October 2026."
  azure:
    summary: "Azure Web PubSub holds connections, groups and presence and calls Azure Functions with client events, Cosmos DB stores history, Event Grid distributes domain events and Notification Hubs sends push."
    notes:
      - "Web PubSub manages groups and sending to a group or user: you don't have to store connections yourself. It also speaks the Socket.IO protocol if you already use it."
      - "You pay per unit per day (each unit supports a fixed number of concurrent connections) plus outbound messages above the included amount, counted in 2 KB blocks; inbound messages are free."
      - "The Free tier is for testing only; Premium adds autoscaling, availability zones, custom domains and geo-replication."
      - "Event Grid does not publish straight into Web PubSub: a function subscribed to the event sends to the right group."
  gcp:
    summary: "Cloud Run holds the WebSocket connections, Memorystore for Valkey fans messages out across instances and stores presence, Firestore the history, Pub/Sub domain events and Firebase Cloud Messaging the push."
    notes:
      - "On Cloud Run a WebSocket connection is a request: it lasts at most the service timeout (up to 60 minutes) and the client has to reconnect."
      - "While connections are open the instance is active and billed with CPU allocated; a thousand users connected all day cost like instances running all day."
      - "Session affinity is best effort: each instance subscribes to Valkey channels to receive what the others publish."
      - "If the use case is mostly document sync, Firestore real-time listeners spare you from writing the WebSocket server."
tiers:
  - name: "SSE or a small managed service"
    when: "Notifications and live dashboards with a few thousand users and mostly server-to-client traffic."
    cost: 1
    ops: 1
    onprem: "Server-Sent Events from the existing API behind the proxy, with Valkey pub/sub to fan out across replicas."
    aws: "API Gateway WebSocket with Lambda and on-demand DynamoDB, or AppSync Events if publishing to channels is enough."
    azure: "Web PubSub Standard with one unit and Azure Functions on consumption."
    gcp: "Cloud Run with SSE or WebSocket, at least one instance and shared-core Memorystore."
    tradeoffs: "No multi-zone high availability for connection state, and managed-service limits you need to know."
  - name: "Production with presence and history"
    when: "Chat or collaboration with tens of thousands of connections, rooms, presence and message recovery."
    cost: 2
    ops: 2
    onprem: "Centrifugo on three nodes with Valkey Sentinel, PostgreSQL with Patroni and Gorush for push."
    aws: "API Gateway WebSocket or AppSync Events, DynamoDB with TTL for connections, EventBridge and SNS mobile push."
    azure: "Web PubSub Premium with autoscaling and zones, Cosmos DB, Event Grid and Notification Hubs Standard."
    gcp: "Cloud Run with several minimum instances, Memorystore with a replica, Firestore and FCM."
    tradeoffs: "You pay for open connections even when nobody types; fan-out to large rooms multiplies messages and cost."
  - name: "Massive or global scale"
    when: "Hundreds of thousands or millions of connections, live events or users on several continents."
    cost: 4
    ops: 3
    onprem: "Centrifugo with Valkey Cluster or NATS as broker, several sites and global L4 load balancing."
    aws: "AppSync Events in several Regions, DynamoDB global tables and raised connection quotas."
    azure: "Web PubSub Premium with geo-replication and multi-region Cosmos DB."
    gcp: "Cloud Run in several regions behind the global load balancer and per-region Memorystore bridged by Pub/Sub."
    tradeoffs: "Ordering messages across regions is hard; you usually accept per-room, per-region ordering, not global."
extensions:
  - name: "SSE as the simple alternative"
    when: "When only the server pushes data and the client writes with ordinary HTTP requests."
    cost: "low"
    onprem: "SSE from the API"
    aws: "Lambda response streaming"
    azure: "SSE from Container Apps"
    gcp: "SSE from Cloud Run"
  - name: "Managed channel broadcast"
    when: "When fan-out to large rooms is the dominant pattern."
    cost: "medium"
    onprem: "Centrifugo"
    aws: "AWS AppSync Events"
    azure: "Web PubSub groups"
    gcp: "Firestore listeners"
  - name: "Recovery after reconnection"
    when: "When losing messages during a network drop is not acceptable."
    cost: "low"
    onprem: "Centrifugo channel history"
    aws: "Query by sequence number"
    azure: "Cosmos DB query by sequence"
    gcp: "Firestore query by timestamp"
  - name: "Per-connection rate limiting"
    when: "So a buggy or malicious client cannot flood a room."
    cost: "low"
    onprem: "Centrifugo limits"
    aws: "API Gateway route throttling"
    azure: "Logic in the event handler"
    gcp: "Token bucket in Valkey"
  - name: "Expiring presence"
    when: "To show who is online without ghost states after abrupt disconnects."
    cost: "low"
    onprem: "Keys with TTL in Valkey"
    aws: "DynamoDB TTL"
    azure: "Connect/disconnect events"
    gcp: "Keys with TTL in Memorystore"
savings:
  - "If traffic is server-to-client, use SSE on the API you already have: no new service, no connection quota and no heartbeats to pay for."
  - "On API Gateway WebSocket, batch updates into one message every few hundred milliseconds instead of one per change: you pay per message and per 32 KB block."
  - "On Web PubSub outbound messages are counted in 2 KB blocks: compress, or send diffs instead of the full state."
  - "On Cloud Run, close connections from hidden tabs (Page Visibility API) and reconnect when they return: every open connection keeps an instance billing."
  - "Put a TTL on connections and presence in DynamoDB or Valkey so you don't pay storage and writes for dead connections."
  - "Don't use push for what the user will see on opening the app: push is for urgent things; the rest syncs on reconnect."
---

## When you need it

When users must see a change without reloading, in under a second: a chat, a document several people edit at once, a courier's position, a live score, an operations dashboard or the 'order ready' notice. If a few seconds of delay are acceptable, periodic polling is simpler and probably enough. If only the server talks, Server-Sent Events (SSE) over plain HTTP covers most cases without WebSockets.

The hard part is not opening a WebSocket but what comes after: thousands of connections spread across instances, a message that has to reach everyone in a room, clients that drop in a tunnel and come back with gaps, and users who close the app and still need to know.

## Scenarios

### Notifications in a B2B SaaS

The server announces that a report finished or that someone commented. Traffic is server-to-client only and volume is moderate: SSE from the existing API, with Valkey or the event bus so any replica can deliver the notice. No new service.

### Chat or collaboration

Bidirectional traffic, rooms, presence ('typing…'), history and read receipts. A dedicated service (Web PubSub, AppSync Events, Centrifugo) that manages groups and reconnection pays off here, plus a database holding history ordered by room and sequence number. Push alerts whoever is offline.

### Live event with spikes

A match or a launch: hundreds of thousands of clients connect within minutes and almost all of them only listen. The bottleneck is the rate of new connections and the fan-out. Request quota increases ahead of time, spread reconnections with random jitter and batch updates: the client doesn't need every change, it needs the latest.

### Client that requires on-premises

Centrifugo with Valkey and PostgreSQL covers channels, presence and history; mobile push still goes out to APNs and FCM, which are Apple and Google services. If that is not acceptable, the app can only notify while it is open.

## How it fits together

The client opens a WebSocket to the connection layer, authenticating with a short-lived token in the initial request (not in the URL if you can avoid it, because it ends up in logs). The connection layer records the connection and its subscriptions in the connections and presence store and forwards incoming messages to the business logic.

The logic validates the message, stores it in the history store with a per-room sequence number and publishes a domain event. The event bus delivers it to whatever does the fan-out: it looks up which connections are subscribed to that room and sends them the message, whichever instance holds them. With managed services (Web PubSub, AppSync Events) the service does that fan-out; with API Gateway WebSocket or Cloud Run you do it yourself, with DynamoDB or Valkey channels.

If the recipient has no open connection, the logic sends a push through APNs or FCM. On reconnecting, the client sends the last sequence number it saw and receives what is missing from the history, not from the connection.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Centrifugo, Valkey, PostgreSQL and your API behind Caddy or HAProxy with long timeouts. A well-sized host handles tens of thousands of connections (tune `ulimit` and the kernel's network parameters). Back up PostgreSQL; Valkey only holds ephemeral state.

**On-premises Kubernetes.** Centrifugo as a Deployment with several replicas and Valkey in Sentinel or cluster mode, an L4 load balancer or an Ingress that supports WebSocket with long timeouts, CloudNativePG for history and KEDA if you scale event consumers. Configure `preStop` and slow draining: killing a pod with ten thousand connections causes ten thousand simultaneous reconnects.

**Cloud without Kubernetes.** This is the diagram's design: API Gateway WebSocket or AppSync Events with Lambda, Web PubSub with Functions, or Cloud Run with Memorystore. You don't manage connections at the OS level, but you do live with their duration limits and billing model.

**Managed Kubernetes.** EKS, AKS or GKE running Centrifugo or your Socket.IO server pay off with massive, steady connection counts, where paying per connection minute on a managed service costs more than reserved nodes.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Vertical | Small on-premises |
| On-premises Kubernetes | Three or more nodes | High | Replicas and broker | On-premises with HA |
| Managed service | Near zero | Low | Automatic, within quotas | Default choice |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA on connections | Massive, steady connections |

## Key decisions

- **WebSocket or SSE.** SSE runs over HTTP, passes through proxies without surprises and reconnects on its own; you only need WebSocket if the client sends many messages or you need binary frames.
- **A service with groups, or your own fan-out.** Web PubSub, AppSync Events and Centrifugo solve broadcast; API Gateway WebSocket and Cloud Run make you store connections and fan out yourself, which makes large rooms expensive.
- **Ordering and delivery.** Guarantee per-room ordering with a sequence number assigned on write, and tolerate duplicates on the client. Global ordering and exactly-once delivery don't exist at a reasonable price.
- **The connection is not state.** History and presence live elsewhere; the connection can drop at any moment and the design must assume it.
- **Push as a complement.** Decide what deserves a push and what waits for reconnection; pushing everything exhausts users' patience and your quotas.

## Common pitfalls

- Clients that reconnect without random backoff: after a deployment or an outage they all return at once and take the service down.
- Keeping the connection list in each instance's memory, so messages only reach clients connected to the same one.
- Forgetting heartbeats: API Gateway closes after 10 idle minutes, and many proxies sooner.
- Authenticating only on connect and never revoking: a user removed from a room keeps receiving messages until they reconnect.
- Sending the full state on every change instead of diffs, multiplying billed messages.
- Treating push as reliable: APNs and FCM can delay or drop; anything important must also be in the history.
