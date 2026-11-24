---
title: "Data lakehouse on Iceberg"
short: "Data lakehouse"
summary: "Bring data from operational databases, APIs and files into one open, layered store (bronze, silver, gold) with a central catalogue and permissions, so analysts and BI query with SQL without copying data between systems."
description: "Lakehouse with CDC ingestion, bronze/silver/gold Iceberg layers, a catalogue, dbt and a SQL engine on AWS, Azure, GCP and on-premises."
order: 10
requirements:
  - "Source data arrives without loading the operational database and with change history (CDC)."
  - "Tables are stored in an open format (Iceberg) that several engines can read and write."
  - "Every layer (bronze, silver, gold) has an owner, quality tests and lineage."
  - "Permissions are defined once in the catalogue and enforced by every engine, including sensitive columns."
  - "Transformations are versioned, reproducible code, orchestrated with retries."
  - "Query cost is predictable: partitioning, compaction and per-team limits."
platforms:
  onprem:
    summary: "Airbyte and Debezium load Iceberg tables on Ceph RGW; Spark and dbt build silver and gold, Trino queries, Superset presents and Airflow or Dagster orchestrate."
    notes:
      - "Hive Metastore still works as a catalogue but does not manage permissions: today an Iceberg REST catalogue (Lakekeeper, Apache Polaris or Nessie) is a better starting point, with permissions in that catalogue or in Ranger/OPA on Trino."
      - "Iceberg compaction and snapshot expiry are your job: schedule them in the orchestrator or the lake fills up with small files and orphaned metadata."
      - "Trino scales out for concurrent queries; DuckDB is enough for a single analyst or for local tests against the same tables."
      - "The cost is fixed hardware (Ceph disks and compute nodes) and, above all, the team running five or six different systems."
  aws:
    summary: "DMS and Glue load into S3 Tables (managed Iceberg); Glue Spark with dbt transforms, Lake Formation governs permissions, Athena queries, Quick Sight presents and MWAA orchestrates."
    notes:
      - "S3 Tables stores Iceberg tables in table buckets and handles compaction, snapshot management and unreferenced file removal for you; it exposes an Iceberg REST catalogue and integrates with the Glue Data Catalog."
      - "Since 2026 the Glue Data Catalog supports IAM-only authorisation on S3 Tables; Lake Formation remains the option for column, row or tag-based permissions."
      - "QuickSight is now Quick Sight, the BI component of the Amazon Quick suite; existing dashboards and datasets carry over."
      - "MWAA bills per provisioned environment even when idle; MWAA Serverless (since November 2025) is pay-per-use but only supports operators from the Amazon provider package."
      - "Athena bills per data scanned: partition by date, use compressed Parquet and set workgroups with a per-query limit."
  azure:
    summary: "Data Factory ingests into OneLake, Fabric Spark with dbt transforms, Purview catalogues and classifies, Fabric Warehouse queries with T-SQL, Power BI presents and Fabric Data Factory orchestrates."
    notes:
      - "OneLake stores tables natively as Delta Lake; Iceberg comes through metadata virtualisation (shortcuts to Iceberg tables and, in preview, exposing Delta as Iceberg), not as the primary format."
      - "For database CDC, Fabric mirroring replicates into OneLake in near real time with no pipelines; Data Factory fits APIs and files better."
      - "Fabric Data Factory combines pipelines and Apache Airflow jobs; Airflow jobs do not yet support private networks or VNets."
      - "All of Fabric is billed by capacity (F SKU) shared between Spark, Warehouse and Power BI: a heavy notebook can slow down reports unless you separate capacities."
  gcp:
    summary: "Datastream replicates changes to Cloud Storage or BigQuery, Dataproc with dbt transforms Iceberg tables managed by BigLake, Dataplex governs, BigQuery queries, Looker presents and Cloud Composer orchestrates."
    notes:
      - "In April 2026 Google renamed BigLake to Google Cloud Lakehouse (its metastore is now the Lakehouse runtime catalog) and Dataplex to Knowledge Catalog; APIs, IAM roles and commands keep the old names."
      - "The catalogue exposes the Iceberg REST API: Spark on Dataproc and BigQuery read and write the same tables under the same policies."
      - "BigQuery bills per bytes scanned (on-demand) or per reserved slots; with large analyst teams, autoscaling reservations make the cost predictable."
      - "Cloud Composer has a fixed cost per environment; Dataproc Serverless avoids keeping Spark clusters running between jobs."
tiers:
  - name: "Single-team warehouse"
    when: "A small data team, tens of GB to a few TB and dashboards refreshed once a day."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: MinIO or Ceph RGW, a REST catalogue (Lakekeeper), DuckDB or single-node Trino, dbt-core on cron and Superset."
    aws: "Glue or DMS into S3 Tables, dbt on Athena, scheduling with EventBridge Scheduler and Quick Sight."
    azure: "A small Fabric capacity with mirroring, notebooks and dbt on Warehouse, and Power BI included in the capacity."
    gcp: "Datastream into BigQuery, dbt on on-demand BigQuery and Looker Studio, with no Spark clusters."
    tradeoffs: "No full orchestrator and no Spark: complex or very large transformations are done in SQL and lineage is thinner."
  - name: "Layered lakehouse"
    when: "Several teams, CDC sources, several TB and a need for column-level permissions and lineage."
    cost: 2
    ops: 2
    onprem: "Kubernetes with Spark Operator, Trino, Airflow or Dagster, an Iceberg REST catalogue and clustered Ceph RGW."
    aws: "The diagram as drawn: DMS/Glue, S3 Tables, Lake Formation, Glue Spark with dbt, Athena, MWAA and Quick Sight."
    azure: "The diagram as drawn on a right-sized Fabric capacity, Purview for classification and lineage, and Airflow in Fabric."
    gcp: "The diagram as drawn: Datastream, Lakehouse with Iceberg, Dataproc Serverless with dbt, BigQuery with reservations and Composer."
    tradeoffs: "More components and more skills needed (data and platform engineering); the fixed cost of the orchestrator and catalogue shows up even under light load."
  - name: "Enterprise data platform"
    when: "Many domains, regulated data, AI and BI consumers with SLAs, and teams across regions."
    cost: 4
    ops: 3
    onprem: "Several Trino clusters per workload, Ranger or OPA for permissions, Ceph replicated across sites and a dedicated platform team."
    aws: "Per-domain accounts with Lake Formation cross-account sharing, Redshift for heavy BI on the same Iceberg tables and MWAA per domain."
    azure: "Several Fabric capacities per domain, OneLake domains, Purview with sensitivity labels and reserved capacity."
    gcp: "Per-domain projects with Knowledge Catalog, BigQuery reservations per team, Analytics Hub for sharing and regional Composer."
    tradeoffs: "The challenge stops being technical and becomes governance: data contracts, domain owners and per-team FinOps."
extensions:
  - name: "Streaming ingestion"
    when: "When dashboards or models need data that is minutes old, not from yesterday."
    cost: "medium"
    onprem: "Kafka + Flink"
    aws: "Data Firehose to Iceberg tables"
    azure: "Fabric Eventstream"
    gcp: "Pub/Sub to BigQuery"
  - name: "Data quality and contracts"
    when: "When a source change breaks dashboards and nobody notices until the business does."
    cost: "low"
    onprem: "dbt tests + Great Expectations"
    aws: "Glue Data Quality"
    azure: "Purview Data Quality"
    gcp: "Knowledge Catalog data quality"
  - name: "Semantic layer"
    when: "When every dashboard computes 'revenue' differently."
    cost: "low"
    onprem: "Cube or dbt Semantic Layer"
    aws: "Quick Sight topics"
    azure: "Power BI semantic models"
    gcp: "LookML in Looker"
  - name: "Warehouse for heavy BI"
    when: "When hundreds of concurrent users make the ad hoc engine slow or expensive."
    cost: "high"
    onprem: "ClickHouse or StarRocks"
    aws: "Amazon Redshift Serverless"
    azure: "Fabric Warehouse on its own capacity"
    gcp: "BigQuery BI Engine"
  - name: "Sharing with third parties"
    when: "When partners or subsidiaries need to query without receiving copies."
    cost: "low"
    onprem: "Delta Sharing or Trino views"
    aws: "Lake Formation cross-account"
    azure: "OneLake shortcuts"
    gcp: "BigQuery sharing (Analytics Hub)"
savings:
  - "Turn on compaction and snapshot expiry (automatic in S3 Tables, scheduled on self-managed Iceberg): fewer small files means lower read and request costs."
  - "On Athena and on-demand BigQuery, partition by date, select only the columns you need and set a bytes limit per query or per workgroup."
  - "Run Spark serverless or on Spot/preemptible capacity (Glue Flex, Dataproc Serverless, EMR on Spot) for batch jobs that tolerate retries."
  - "Pause the development Fabric capacity out of hours and reserve the production one if its usage is steady."
  - "Move old bronze data to cold storage classes (S3 Intelligent-Tiering, Blob cool/archive tiers, Cloud Storage Autoclass) once silver and gold can be rebuilt."
  - "Only pay for MWAA, MWAA Serverless or Cloud Composer when your DAGs justify it; with a handful of daily jobs a native scheduler (EventBridge Scheduler, Cloud Scheduler) costs almost nothing."
---

## When you need it

When business questions span data from several systems and today's answer is an Excel export or queries straight against the production database. A lakehouse makes sense when you have several sources (ERP, your own application, CRM, partner files), several consumers (BI, data science, AI models) and a need for all of them to read the same version of the data under the same permissions.

If everything fits in one analytics PostgreSQL database used by one team, you don't need it yet. The jump pays off when volume, the variety of engines or governance (who sees which column) outgrow what a single warehouse handles comfortably.

## Scenarios

- **Startup with one analyst.** Datastream, DMS or Fabric mirroring copy the production database into a managed warehouse, dbt builds ten models and a dashboard refreshes nightly. No Spark, no Airflow: dbt and the native scheduler are enough. Iceberg is still worth it because it avoids locking you into one engine as you grow.
- **Regulated company with personal data in the EU.** The catalogue is the centrepiece: automatic classification of sensitive columns, role-based masking and lineage to answer auditors. Everything in an EU region, encrypted with your own keys, and the bronze layer with short retention because it holds data that is not yet pseudonymised.
- **Retailer with seasonal peaks.** Ingestion switches to streaming during campaigns and the SQL engine needs more concurrency for a few weeks. Serverless engines (Athena, on-demand BigQuery) absorb the peak without reservations; on Fabric you scale the capacity up temporarily.
- **Customer that requires on-premises.** Same design with open components: Iceberg on S3-compatible storage, a REST catalogue, Spark and Trino on Kubernetes. What changes is that compaction, upgrades and capacity depend on your team.
- **AI team that needs features and text.** Gold tables feed the feature store and the training pipelines; documents go into a separate index. The lakehouse is the source of truth, not the place where predictions are served.

## How it fits together

Sources hand data to the ingestion layer. For databases that means CDC: reading the transaction log and emitting inserts, updates and deletes without heavy queries against production. For APIs and files it means scheduled, incremental extracts.

Everything lands in the **bronze** layer of the lake as Iceberg tables: data as it arrived, plus load metadata. The catalogue registers every table, its schema and its permissions; any engine that reads or writes goes through it.

Transformation (Spark for volume, dbt for the logic in SQL) reads bronze and builds **silver** (clean, deduplicated, correctly typed data) and then **gold** (business models ready to consume: sales per day, active customers). The orchestrator runs those transformations in order, with dependencies, retries and alerts; it also runs table maintenance.

The SQL engine queries lake tables directly, without copying them, and the BI tool connects to that engine. The permissions defined in the catalogue (table, column, row) apply both to the analyst writing SQL and to the dashboard.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Good for a small team or a development environment: MinIO as S3 storage, Lakekeeper as the Iceberg REST catalogue with its PostgreSQL, single-node Trino or DuckDB, Superset behind a reverse proxy (Caddy or Traefik with TLS) and dbt run from cron. The MinIO and PostgreSQL volumes are the only state: copy the bucket elsewhere and `pg_dump` the catalogue, because without the catalogue the tables cannot be read consistently.

**On-premises Kubernetes (k3s or RKE2).** For several teams: Spark Operator for Spark jobs, Trino with its official chart and autoscaled workers, Airflow or Dagster with their charts, CloudNativePG for the catalogue and orchestrator databases, cert-manager for TLS and Ceph (Rook) as object storage. KEDA can scale Trino workers from the query queue.

**Cloud without Kubernetes.** The default in the cloud: S3 Tables, Glue and Athena; OneLake and Fabric; Google's Lakehouse and BigQuery. No servers; you pay per data scanned, per DPU or per capacity. dbt can run as an ECS Fargate task, a Container Apps job or a Cloud Run job.

**Managed Kubernetes (EKS, AKS, GKE).** Worth it if you already run a Kubernetes platform and want your own Trino or Spark for cost or portability, reading the same Iceberg tables from the managed catalogue.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Very low | Medium | One host | Small team, development |
| On-prem Kubernetes | High | High | Horizontal | Sovereignty or on-prem customer |
| Cloud serverless | Low or per capacity | Low | Automatic | Default choice |
| Managed Kubernetes | Medium | Medium | Horizontal | Existing K8s platform, portability |

## Key decisions

- **Open format or proprietary warehouse.** Iceberg lets you switch engines without migrating data; a closed warehouse gives better performance with no effort. On Azure, OneLake is natively Delta and Iceberg comes through virtualisation: choose with the reading engines in mind.
- **Managed or self-run catalogue.** The catalogue is the single point for permissions. A managed one (Lake Formation, Purview, Knowledge Catalog) spares you from running the most critical piece; your own gives portability.
- **ETL in Spark or ELT in SQL with dbt.** dbt in SQL can be maintained by analysts and comes with tests and lineage; Spark is needed for large volumes, semi-structured data or logic that doesn't fit in SQL.
- **Pay per query or per capacity.** Athena and on-demand BigQuery are cheap for sporadic use and expensive under heavy use; Fabric or BigQuery reservations give a predictable fixed cost.
- **Full orchestrator or simple scheduler.** Airflow gives dependencies, retries and backfills; for five daily jobs it is oversized.

## Common pitfalls

- Pulling from the production database with full extract queries instead of CDC, degrading the application every night.
- Never compacting or expiring snapshots: queries get slow and storage grows unchecked.
- Granting permissions on storage (the bucket) instead of in the catalogue, so each engine enforces different rules.
- Untested transformations that propagate nulls or duplicates all the way to the board's dashboard.
- Exposing bronze to analysts 'because it has all the data', personal data included.
- Leaving the orchestration environment or the development capacity running all month with no use.
