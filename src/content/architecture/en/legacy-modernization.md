---
title: "Modernising a legacy monolith"
short: "Monolith modernisation"
summary: "Getting a legacy application out of the data centre and modernising it piece by piece without a big bang: rehost first, a facade that splits routes between the monolith and new services, and CDC to move data without dual writes."
description: "Modernise a monolith with rehost, strangler fig, anti-corruption layer, CDC database migration and licensing: AWS, Azure, GCP and on-premises."
order: 25
requirements:
  - "Users don't notice the migration: the facade keeps the same URLs while routes change destination."
  - "Every migrated feature can be sent back to the monolith by changing one routing rule."
  - "Each piece of data has exactly one system writing it at any time; no request ever writes to both databases."
  - "New services don't inherit the monolith's model: they translate it in an anti-corruption layer."
  - "The database migration has a rehearsed cutover and a rollback plan."
platforms:
  onprem:
    summary: "The monolith stays on its VMs (Proxmox or VMware), Nginx or Envoy act as the route-based facade, new services go to Kubernetes with PostgreSQL and Debezium replicates changes from SQL Server or Oracle."
    notes:
      - "Debezium reads the transaction log (SQL Server CDC, LogMiner or OpenLogReplicator on Oracle) and publishes to Kafka; a JDBC sink connector or your service writes to PostgreSQL."
      - "On SQL Server you must enable CDC per database and per table, and the cleanup job must leave enough headroom so Debezium doesn't lose changes after a stop."
      - "VMware's price rise after the Broadcom acquisition is pushing many teams to Proxmox: moving the VMs is a rehost in itself, with its own plan and testing."
      - "The cost lies in the legacy engine's licences and in running two platforms side by side for months."
  aws:
    summary: "AWS Transform MGN (formerly Application Migration Service) rehosts to EC2, an ALB with path rules splits traffic between the monolith and ECS Fargate, the database moves to RDS for SQL Server and AWS DMS replicates with CDC into Aurora PostgreSQL."
    notes:
      - "Application Migration Service was renamed AWS Transform MGN in June 2026 with the same APIs; agentless replication is no longer available for new deployments, so plan on installing the agent."
      - "AWS DMS does full load plus CDC from SQL Server to Aurora PostgreSQL; DMS Schema Conversion translates the schema and flags what it can't convert. The source needs MS-CDC or SQL Server replication enabled."
      - "RDS for SQL Server includes the licence in the hourly price; if you own licences with Software Assurance, compare against EC2 with licence mobility before deciding."
      - "AWS Transform for .NET ports .NET Framework applications to cross-platform .NET so they run on Linux and containers; always review the output and any native Windows dependencies."
      - "Migration Hub stopped accepting new customers in November 2025; wave planning and recommendations now live in AWS Transform."
  azure:
    summary: "Azure Migrate (now Azure Catalyst) rehosts to Azure VMs, Application Gateway routes by path, the database moves to Azure SQL Managed Instance and new services go to Container Apps with Azure Database for PostgreSQL."
    notes:
      - "Azure Migrate has been evolving into Azure Catalyst since November 2026; existing projects and workflows keep working as before."
      - "Azure DMS only migrates SQL Server into the Azure SQL family (Database, Managed Instance, SQL on VMs): it doesn't do heterogeneous CDC into PostgreSQL. For that, run Debezium on Container Apps or AKS with the Event Hubs Kafka endpoint."
      - "To reach Managed Instance with minimal downtime, the Managed Instance link replicates in near real time; the Azure Data Studio migration extension was retired in February 2026 along with the tool itself."
      - "Azure Hybrid Benefit lets you use Windows Server and SQL Server licences with Software Assurance on VMs and Managed Instance: it is often the biggest saving of the whole migration."
      - "Managed Instance keeps near-full SQL Server compatibility (Agent, CLR, cross-database queries); the next-gen General Purpose tier supports more databases and storage per instance."
  gcp:
    summary: "Migrate to Virtual Machines rehosts to Compute Engine, Cloud Load Balancing routes by path, the database moves to Cloud SQL for SQL Server and Database Migration Service replicates continuously into Cloud SQL for PostgreSQL."
    notes:
      - "Database Migration Service runs continuous heterogeneous migrations from SQL Server and Oracle to Cloud SQL for PostgreSQL or AlloyDB, with an assisted schema conversion workspace."
      - "Homogeneous migrations (SQL Server to Cloud SQL for SQL Server) carry no extra charge and start from backups; heterogeneous ones are billed by data volume."
      - "Cloud SQL for SQL Server includes the licence in the price; to bring your own, run SQL Server on Compute Engine with licence mobility or on sole-tenant nodes."
      - "Migrate to Virtual Machines replicates from VMware, AWS and Azure; test on clones before cutover, which don't interrupt replication."
tiers:
  - name: "Rehost"
    when: "You must leave the data centre by a date (contract end, unsupported hardware) with no time to change code."
    cost: 2
    ops: 2
    onprem: "Move the VMs from VMware to Proxmox with the same applications and the same database."
    aws: "AWS Transform MGN to EC2, the database as-is on EC2 or on RDS for SQL Server, with an ALB in front."
    azure: "Azure Migrate to Azure VMs with Azure Hybrid Benefit and the database on Managed Instance."
    gcp: "Migrate to Virtual Machines to Compute Engine and the database on Cloud SQL for SQL Server."
    tradeoffs: "You carry the same old problems somewhere else; savings come from right-sizing and licensing, not architecture."
  - name: "Replatform and strangler fig"
    when: "The application has a future and the team can extract features one by one over several months."
    cost: 3
    ops: 3
    onprem: "Facade on Nginx or Envoy, new services on Kubernetes with PostgreSQL and Debezium replicating from the legacy database."
    aws: "ALB with path rules, services on ECS Fargate with Aurora PostgreSQL and AWS DMS in continuous CDC."
    azure: "Application Gateway by path, Container Apps with Azure Database for PostgreSQL and Debezium on Event Hubs."
    gcp: "Cloud Load Balancing by path, Cloud Run with Cloud SQL for PostgreSQL and continuous Database Migration Service."
    tradeoffs: "During the transition you pay for and operate two systems plus a CDC pipeline; if the project stalls halfway, you get the worst of both."
  - name: "Full refactor"
    when: "The monolith is blocking the business and there is budget to redesign domains, data and integrations."
    cost: 4
    ops: 3
    onprem: "Kubernetes platform with an event bus, one database per service and the monolith retired in phases."
    aws: "Services on ECS or EKS with events on EventBridge, per-service databases and the monolith switched off at the end."
    azure: "Container Apps or AKS with Service Bus, per-service databases and the monolith switched off at the end."
    gcp: "Cloud Run or GKE with Pub/Sub, per-service databases and the monolith switched off at the end."
    tradeoffs: "The most expensive and riskiest option; it is almost always better reached through the strangler fig than in one go."
extensions:
  - name: "Anti-corruption layer"
    when: "When the monolith's model must not leak into the new services."
    cost: "low"
    onprem: "Your own translator service"
    aws: "Translator service on Fargate"
    azure: "Translator service on Container Apps"
    gcp: "Translator service on Cloud Run"
  - name: "Shadow traffic"
    when: "To compare the new service's responses with the monolith's before switching the route."
    cost: "low"
    onprem: "Envoy mirroring"
    aws: "Duplication at the facade"
    azure: "Duplication at the facade"
    gcp: "Load balancer request mirroring"
  - name: "Event bus with outbox"
    when: "When the monolith also needs to learn what the new services write."
    cost: "medium"
    onprem: "Kafka + Debezium (outbox)"
    aws: "Amazon MSK or EventBridge"
    azure: "Event Hubs or Service Bus"
    gcp: "Pub/Sub"
  - name: "Feature flags"
    when: "To move users by percentage or by customer rather than all at once."
    cost: "low"
    onprem: "Unleash or Flagsmith"
    aws: "AWS AppConfig"
    azure: "Azure App Configuration"
    gcp: "Firebase Remote Config"
  - name: "Managed hosting for .NET Framework"
    when: ".NET Framework web apps with Windows dependencies that aren't worth porting yet."
    cost: "medium"
    onprem: "IIS on Windows VMs"
    aws: "Elastic Beanstalk on Windows"
    azure: "Managed Instance on App Service"
    gcp: "Compute Engine with Windows"
  - name: "Migrated data validation"
    when: "Before every cutover, to check row counts and checksums between source and target."
    cost: "low"
    onprem: "Comparison with your own queries"
    aws: "AWS DMS data validation"
    azure: "Comparison with your own queries"
    gcp: "Data Validation Tool"
savings:
  - "Apply Azure Hybrid Benefit or licence mobility with Software Assurance to Windows Server and SQL Server: licensing usually outweighs infrastructure."
  - "Check the SQL Server edition: many Enterprise databases only use Standard features, and switching makes the licence bundled into RDS, Managed Instance or Cloud SQL much cheaper."
  - "Right-size after the rehost using real usage data, not the size of the source VMs, which are usually oversized; then commit with Savings Plans, reservations or CUDs."
  - "Porting .NET Framework to modern .NET lets you move to Linux and containers and stop paying Windows licences on every instance."
  - "Switch off whatever no longer receives traffic as early as possible: every migrated route should shrink the monolith's replicas, not just add new services."
  - "Retire the CDC pipeline and the legacy database as soon as each domain is migrated: replication instances and licences keep billing."
---

## When you need it

When an application has been running for ten or twenty years, brings in revenue and nobody dares touch it: a bespoke ERP, a .NET Framework intranet on IIS, a Java EE system on WebLogic with Oracle behind it. The reasons to move it are usually external: the data centre contract ends, the hardware loses support, the VMware or Oracle renewal skyrockets, or the business asks for changes the monolith can't absorb at a reasonable pace.

The temptation is to rewrite it from scratch. It rarely works: the rewrite takes years, the original keeps changing and on cutover day rules nobody documented come to light. This case describes the incremental alternative.

## Scenarios

### Data centre exit with a deadline

Six months to get out. Rehost with the cloud's migration tool (continuous disk replication, tests on clones and cutover in waves), move the database to its equivalent managed service, and nothing else. Modernisation starts afterwards, once deadline pressure is gone. Buying time is a legitimate strategy.

### .NET Framework application with SQL Server

The most common enterprise case. Three paths: keep it on Windows (VMs or managed hosting for .NET Framework), port it to modern .NET for Linux containers, or extract features into new services. Licensing decides a lot: with Software Assurance, Azure Hybrid Benefit often makes Azure the cheapest option for this profile.

### Java monolith with Oracle

Oracle counts vCPUs in its own way on authorised clouds, and its licence is usually the largest line item. The usual goal is to leave Oracle for PostgreSQL: schema conversion (PL/SQL is the costly part), CDC from Oracle and migration domain by domain. If leaving is not viable in the short term, the Oracle Database offerings inside each cloud keep the engine close to the application.

### Regulated sector or client that requires on-premises

Modernisation happens inside: from VMware to Proxmox or on-premises Kubernetes, from Oracle to PostgreSQL with Debezium, and new services on the cluster. The pattern is the same; only who operates each piece changes.

## How it fits together

All traffic enters through the facade, which initially sends every route to the monolith. The monolith, now on its new platform, keeps reading and writing its legacy database.

When a feature is extracted (say, the catalogue), you build the new service with its own database and an anti-corruption layer that translates between the legacy and the new model. While the monolith is still the one writing that data, the CDC pipeline reads the legacy database's transaction log and applies the changes to the new database, so the new service can serve reads with up-to-date data. When the new service becomes the owner of the data, writes switch sides and, if the monolith still needs it, it receives changes through events (outbox) or reverse CDC.

The facade rule for that route changes: `/catalogue/*` goes to the new service. If something breaks, the rule goes back. Route by route, the monolith shrinks until it can be switched off. What you never do is have one request write to both databases: without a distributed transaction, any failure in between leaves inconsistent data.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Useful for containerising the monolith without code changes (if it runs on Linux) and for the development environment: the monolith, an Nginx facade, Debezium with Kafka in KRaft mode and PostgreSQL. It is not the production platform for a migration of this size.

**On-premises Kubernetes.** RKE2 or k3s with the facade as a Gateway (Envoy Gateway), new services as Deployments, CloudNativePG for PostgreSQL and Strimzi for Kafka and the Debezium connectors. The monolith can stay on VMs or be containerised; KubeVirt lets it run on the same cluster as a VM.

**Cloud without Kubernetes.** The diagram's design: the monolith on migrated VMs, new services on ECS Fargate, Container Apps or Cloud Run, and the managed data migration service. The quickest to set up.

**Managed Kubernetes.** EKS, AKS or GKE pay off if the end state is a microservices platform and you want to build it from the start, or if the containerised monolith needs fine-grained network and resource control.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Manual | Development and containerisation tests |
| On-premises Kubernetes | Cluster | High | HPA | Modernising inside the data centre |
| VMs + container PaaS | Monolith VMs | Medium | Per service | Default in the cloud |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA and nodes | Microservices end state |

## Key decisions

- **Rehost, replatform or refactor.** It isn't a single choice: typically you rehost everything, replatform the database and refactor only what the business needs to change.
- **Where to start strangling.** With a feature that has value, few dependencies and bounded data; never with the most coupled core, nor with something so trivial it teaches you nothing.
- **Who writes each piece of data.** Decide the owner of every table in every phase and document the CDC direction. If two systems write the same thing, you have a consistency problem, not a migration problem.
- **Target engine.** Keeping SQL Server on its managed service minimises risk; moving to PostgreSQL removes licences but requires converting stored procedures and lots of testing.
- **Facade in the load balancer or a gateway.** Load balancer path rules are enough; a gateway or Envoy adds shadow traffic, retries and per-route metrics.

## Common pitfalls

- Writing to the old and the new database from the same request 'to keep them in sync'.
- Migrating the database last, with every service already built on the old schema.
- Copying the monolith's model as-is into the new services with no anti-corruption layer: a distributed monolith is worse than the original.
- Not rehearsing the database cutover with real volumes, or not measuring how long it takes.
- Forgetting hidden integrations: nightly FTP files, stored procedures calling external services, reports reading tables directly.
- Leaving the migration half-done indefinitely and paying for two platforms, two teams and the CDC pipeline for years.
