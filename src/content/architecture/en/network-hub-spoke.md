---
title: "Hub-and-spoke network: hybrid connectivity, central inspection and private DNS"
short: "Hub-and-spoke network"
summary: "Connect offices, data centres and several cloud networks through a shared hub, with a firewall that inspects traffic between environments and to the internet, private DNS that resolves both ways and managed services with no public exposure."
description: "Hub-and-spoke network with VPN or dedicated link, central firewall, hybrid DNS and private endpoints: reference on AWS, Azure, GCP and on-premises."
order: 17
requirements:
  - "Production and non-production live on separate networks and only talk through explicit rules."
  - "All traffic between spokes and to the internet goes through an inspection point that logs it."
  - "Private names resolve the same from the office, the data centre and every spoke."
  - "Managed services (databases, storage, secrets) are consumed over private IPs."
  - "IP ranges do not overlap across data centre, offices and spokes, and are planned before the first network is created."
platforms:
  onprem:
    summary: "A core router with VRFs separates production and non-production, OPNsense is the firewall between VRFs and to the internet, PowerDNS resolves internal zones, and IPsec or WireGuard tunnels join sites and cloud."
    notes:
      - "Each VRF is an independent routing table: even if someone misconfigures a VLAN, prod and non-prod cannot see each other unless the router leaks routes between them. Crossing VRFs is forced through OPNsense."
      - "OPNsense as a CARP pair gives high availability; its built-in Suricata adds IDS/IPS, but TLS inspection of all traffic is CPU-heavy and rarely pays off outside internet egress."
      - "PowerDNS separates the authoritative server (internal zones) from the recursor, which conditionally forwards cloud zones to each provider's resolvers through the tunnel."
      - "On-premises \"private endpoints\" are usually an internal reverse proxy that publishes shared services by name without opening the source networks."
      - "The cost is redundant hardware, optional support subscriptions and someone maintaining rules and routes; WireGuard is much simpler than IPsec when both ends are Linux."
  aws:
    summary: "Transit Gateway is the hub between VPCs, Site-to-Site VPN and Direct Connect; AWS Network Firewall attaches natively to the Transit Gateway to inspect east-west and egress traffic, and Route 53 Resolver resolves in both directions."
    notes:
      - "Since 2025 Network Firewall can attach directly to the Transit Gateway as a network function attachment, with no inspection VPC of your own; the Transit Gateway route tables are still yours and must send traffic to the firewall."
      - "If you keep the classic model with an inspection VPC and firewall endpoints, enable appliance mode on that attachment or return traffic may land in another zone and get dropped."
      - "Route 53 Resolver uses inbound endpoints (the office queries AWS) and outbound endpoints with forwarding rules (AWS queries internal DNS); share rules and private zones with other accounts through RAM or Route 53 Profiles."
      - "PrivateLink and interface VPC endpoints are created once in a shared VPC or per spoke; S3 and DynamoDB gateway endpoints are free and keep that traffic off NAT."
      - "You pay per attachment hour and per GB processed on Transit Gateway, per endpoint hour and GB on Network Firewall, and per hour for each Resolver and interface endpoint."
  azure:
    summary: "A Virtual WAN hub secured with Azure Firewall and routing intent forces private and internet traffic from spoke VNets through the firewall; VPN Gateway or ExpressRoute connect the sites, and DNS Private Resolver resolves in both directions."
    notes:
      - "Routing intent has two policies, private traffic and internet traffic: with both enabled, east-west traffic between spokes, sites and regions goes through Azure Firewall without hand-maintained route tables."
      - "The Virtual WAN hub is managed and does not host arbitrary resources: DNS Private Resolver goes in a shared-services VNet connected to the hub, with a forwarding ruleset linked to the spokes."
      - "The `privatelink.*` zones for Private Endpoints live once in the connectivity subscription; Azure Policy creates the DNS records when each endpoint is created, so no team builds duplicate zones."
      - "Azure Firewall Premium adds IDPS and TLS inspection; Standard is usually enough for FQDN filtering on egress."
      - "Fixed cost sits in the hourly price of the hub, firewall and gateways; variable cost in data processed by hub and firewall."
  gcp:
    summary: "Network Connectivity Center joins spoke VPCs and hybrid spokes (Cloud VPN or Interconnect) in a global hub; Cloud NGFW enforces hierarchical policies in every VPC, Cloud DNS resolves both ways, and Private Service Connect publishes services on private IPs."
    notes:
      - "Cloud NGFW is a distributed firewall: rules are enforced at each VM, not at a central box. \"Central inspection\" comes from hierarchical policies at organisation or folder level, not from forcing traffic through a device."
      - "The Enterprise tier adds IPS and URL filtering through zonal firewall endpoints associated with each VPC; if you need a single choke point with a third-party appliance, build it with router appliance spokes or NVAs in a hub VPC."
      - "Spoke VPCs import dynamic routes from hybrid spokes through the hub, so one VPN or Interconnect serves every environment; separating prod and non-prod is done with spoke groups or separate hubs."
      - "The usual spoke is one Shared VPC per environment; Cloud DNS uses forwarding zones to internal DNS and an inbound server policy so the office can resolve private zones."
      - "You pay per spoke and for data crossing the hub, per VPN tunnel or Interconnect attachment and, with NGFW Enterprise, per endpoint hour and GB inspected."
tiers:
  - name: "Single hub with VPN"
    when: "One site or data centre, two or three cloud networks and a small network team."
    cost: 1
    ops: 1
    onprem: "An OPNsense pair acts as router, firewall and WireGuard or IPsec endpoint; PowerDNS on two VMs."
    aws: "Transit Gateway with Site-to-Site VPN, security groups and NACLs for filtering and one NAT per spoke; Resolver with an outbound endpoint."
    azure: "Classic hub VNet peered to spokes, VPN Gateway and NSGs; DNS Private Resolver in the hub."
    gcp: "Shared VPC per environment, HA Cloud VPN, Cloud NGFW Essentials with hierarchical policies and Cloud NAT."
    tradeoffs: "No layer 7 inspection or central flow logging between environments; filtering depends on distributed rules that are hard to audit."
  - name: "Hub with central inspection"
    when: "Several environments and teams, audit requirements or regulated data."
    cost: 2
    ops: 2
    onprem: "Core router with VRFs, OPNsense in CARP with Suricata between VRFs and on egress, PowerDNS authoritative plus recursor."
    aws: "Transit Gateway with natively attached Network Firewall, separate route tables for prod and non-prod, centralised internet egress and Route 53 Profiles."
    azure: "Virtual WAN with a hub secured by Azure Firewall and routing intent; DNS Private Resolver in a shared-services VNet."
    gcp: "NCC with VPC spokes and hybrid spokes, Cloud NGFW Standard with FQDN objects and Secure Web Proxy on egress."
    tradeoffs: "Fixed hourly cost for firewall and hub, and all cross-environment traffic pays extra processing."
  - name: "Multi-region with dedicated links"
    when: "Several regions, heavy hybrid traffic or guaranteed latency and bandwidth."
    cost: 4
    ops: 3
    onprem: "Two data centres with redundant links, BGP between sites and firewalls on every exit."
    aws: "Redundant Direct Connect to several locations, per-region Transit Gateways with peering or Cloud WAN, and Network Firewall in each region."
    azure: "ExpressRoute in two peering locations, per-region Virtual WAN hubs with routing intent and Azure Firewall Premium."
    gcp: "Redundant Dedicated or Partner Interconnect, global NCC and Cloud NGFW Enterprise with endpoints in every zone in use."
    tradeoffs: "Weeks of provisioning lead time, carrier contracts and routing complexity that needs a dedicated network team."
extensions:
  - name: "IPS and TLS inspection"
    when: "Regulated data or a requirement to detect intrusions in traffic between environments."
    cost: "high"
    onprem: "Suricata on OPNsense"
    aws: "Network Firewall (Suricata rules, TLS)"
    azure: "Azure Firewall Premium"
    gcp: "Cloud NGFW Enterprise"
  - name: "FQDN egress proxy"
    when: "When workloads may only reach a closed list of external domains."
    cost: "medium"
    onprem: "Squid"
    aws: "Network Firewall (domain rules)"
    azure: "Azure Firewall (application rules)"
    gcp: "Secure Web Proxy"
  - name: "DNS firewall"
    when: "To stop DNS exfiltration and block known malicious domains."
    cost: "low"
    onprem: "PowerDNS Recursor + RPZ"
    aws: "Route 53 Resolver DNS Firewall"
    azure: "DNS security policy"
    gcp: "Cloud DNS response policies"
  - name: "Centralised flow logs"
    when: "Whenever you need to investigate incidents or justify rules."
    cost: "medium"
    onprem: "ntopng / NetFlow to OpenSearch"
    aws: "VPC Flow Logs + TGW Flow Logs"
    azure: "VNet flow logs + Traffic Analytics"
    gcp: "VPC Flow Logs"
  - name: "Managed-service perimeter"
    when: "To stop data in managed services from leaving to foreign accounts or projects."
    cost: "low"
    onprem: "Egress rules on OPNsense"
    aws: "VPC endpoint policies + RCPs"
    azure: "Network Security Perimeter"
    gcp: "VPC Service Controls"
savings:
  - "Use S3 and DynamoDB gateway endpoints on AWS: they are free and take that traffic off NAT and the firewall."
  - "Centralise internet egress in the hub with a single NAT or firewall instead of one NAT Gateway per VPC; in development one NAT in a single zone is enough."
  - "Exclude traffic that does not need inspection (bulk backups, database replication between zones of the same environment) with specific routes or rules: the firewall charges per GB processed."
  - "Do not create an interface endpoint per service in every spoke: share them from a services VPC or VNet and resolve through central DNS."
  - "Reduce retention and sampling of flow logs in non-production and send them to object storage rather than the most expensive log tool."
  - "Pick the firewall tier per environment: Azure Firewall Basic or Standard and Cloud NGFW Standard in non-prod, keeping IPS and TLS for production only."
---

## When you need it

When the cloud stops being one VPC and becomes ten: one per team and environment, plus the office, the data centre and a partner or two. If every network connects to the others with direct peering, the number of connections grows quadratically, nobody knows what can reach what, and there is no single place to inspect or log. Hub-and-spoke puts a transit hub in the middle: spokes connect only to the hub, the hub decides which routes exist, and a central firewall sees traffic crossing between environments and to the internet.

It is also when hybrid DNS has to be solved: `db.prod.internal` must resolve from an office laptop, and `my-db.privatelink...` must resolve to a private IP from the data centre.

## Scenarios

- **Startup with two environments and no office network.** There is no hybrid connectivity to solve. One network per environment, not connected to each other, with controlled internet egress per environment, is enough. The hub shows up with the third environment, a VPN to a customer or the first audit.
- **Company with a data centre migrating in phases.** Cloud applications still talk to databases in the data centre. The hub with VPN or a dedicated link is the first thing built, together with hybrid DNS; without it every migration stalls on name resolution.
- **Regulated sector with data in the EU.** The auditor will ask for demonstrable separation between prod and non-prod, flow logs and egress inspection. Central inspection with IPS and perimeters around managed services pays off here.
- **Several regions or providers.** One hub per region, connected to each other (Transit Gateway peering, Virtual WAN hubs, global NCC), and IP ranges planned for the whole group. The expensive mistake is discovering overlaps once production is running.
- **Subsidiary or acquisition with overlapping ranges.** It is not joined to the hub: publish what is needed through private endpoints (PrivateLink, Private Link Service, Private Service Connect) or NAT between networks, without merging route tables.

## How it fits together

1. The office or data centre connects over VPN or a dedicated link to hybrid connectivity, which exchanges routes with the transit hub over BGP.
2. The transit hub is the only junction: production and non-production spokes attach to it, never to each other. Each spoke is associated with a route table that decides which destinations it can reach.
3. Hub routes send traffic between spokes, to the sites and to the internet through the central firewall for inspection. The firewall applies per-environment rules, logs every flow and hands allowed traffic back to the hub.
4. Private DNS hangs off the hub: a resolver with an inbound endpoint answers office queries for cloud zones, and forwarding rules send queries for on-premises zones to internal DNS.
5. Private endpoints sit on the hub or on a shared-services network: spokes consume managed databases, storage or secrets over private IPs, and central DNS returns that IP.

On GCP step 3 changes: Cloud NGFW is enforced at each VM with hierarchical policies inherited from the organisation, so inspection is central in policy but distributed in execution.

## Deployment: Docker, Kubernetes or serverless

The network is not deployed in containers, but what runs in each spoke shapes the design.

- **Hosts running Docker Compose.** Each host lives in a private subnet of the spoke with no public IP. The reverse proxy only accepts traffic from the load balancer or firewall, egress goes through the hub and backups go to storage over a private endpoint. It is the easiest to reason about: one IP, a few rules.
- **On-premises Kubernetes (k3s, RKE2).** The cluster needs pod and service ranges that overlap with no other network. With Cilium or Calico, NetworkPolicies filter inside the cluster and the central firewall sees what leaves it. cert-manager and external-dns talk to internal DNS.
- **Managed containers and functions in the cloud.** ECS Fargate in private subnets, Container Apps in a VNet-integrated environment, Cloud Run with Direct VPC egress, and functions with network integration. Forget that integration and the service egresses over the provider's public network, bypassing the hub.
- **Managed Kubernetes (EKS, AKS, GKE).** It consumes many IPs: plan secondary ranges or an overlay CNI. The control plane should be private, nodes egress through the hub and images arrive at the registry over a private endpoint.

| Option | Fixed network cost | Operations | IP footprint | When |
|---|---|---|---|---|
| Compose on hosts | Low | Low | Small | Few, stable workloads |
| Self-run Kubernetes | Medium | High | Large | A platform team already exists |
| PaaS or functions with VPC | Low | Low | Variable | Small team, spiky load |
| Managed Kubernetes | Medium | Medium | Large | Many services and teams |

## Key decisions

- **Central firewall or distributed filtering.** A firewall in the hub gives one logging point and per-environment rules, at a per-GB cost and as a potential bottleneck. Security groups, NSGs or distributed Cloud NGFW are cheaper but harder to audit. Most designs combine both.
- **Managed hub or hand-built.** Virtual WAN and Network Firewall's native Transit Gateway attachment save route tables and inspection plumbing; a classic hub VNet or inspection VPC gives more control over every hop.
- **VPN or dedicated link.** A VPN takes hours to set up and is the right start. Direct Connect, ExpressRoute or Interconnect give predictable bandwidth and latency, but take weeks and need redundancy across two locations.
- **Segmentation by route tables or by hubs.** Separating prod and non-prod with different route tables on the same hub is enough for most; one hub per environment only pays off under strict regulatory requirements.
- **Where private DNS zones live.** Centrally in the connectivity account, subscription or project, never per team: duplicate zones are the most common reason a private endpoint resolves to a public IP.

## Common pitfalls

- Overlapping IP ranges across data centre, spokes and Kubernetes clusters. Fix it in an addressing plan before the first network, not afterwards.
- Asymmetric routing: outbound traffic goes through the firewall and return traffic does not, and connections drop for no obvious reason. Check appliance mode and return routes.
- Leaving a NAT or public IP in a spoke "just for testing": it is an exit that bypasses the firewall.
- Managed services with public access as well as the private endpoint. The endpoint does not close public access on its own.
- Inspecting everything with TLS from day one, and finding the bill and the latency afterwards.
- Building private DNS per team: each new `privatelink` zone breaks resolution for everyone else.
