---
title: "IoT telemetry at scale"
short: "IoT telemetry"
summary: "Connect thousands of devices with their own identity, receive their telemetry over MQTT, keep their desired configuration even while they are offline, let them upload files without permanent credentials and store readings in a time-series database."
description: "IoT ingestion with per-device X.509, MQTT, shadow or twin, temporary-credential file uploads and time series on AWS, Azure, GCP and on-premises."
order: 11
requirements:
  - "Each device authenticates with its own X.509 certificate and can be revoked individually."
  - "A device can only publish and subscribe to its own topics and only write files under its own prefix."
  - "Desired configuration is stored in the cloud and the device applies it when it reconnects."
  - "No permanent cloud key lives on the device: file upload credentials expire."
  - "A reconnection storm or a failed consumer loses no readings: the stream buffers and ingestion is idempotent."
  - "Time series have retention and rollups defined by age."
platforms:
  onprem:
    summary: "Devices speak MQTT with mTLS to EMQX or Mosquitto, desired state lives in PostgreSQL, a bridge forwards messages to Kafka, workers on Kubernetes write them to TimescaleDB and files go to Ceph RGW."
    notes:
      - "EMQX ships under the Business Source License since version 5.9 (May 2025) and a cluster of more than one node needs a licence; earlier versions remain Apache 2.0. Mosquitto is open source but single-node."
      - "Your own twin is a table with `desired`, `reported` and a version per device; the broker publishes the delta to a device topic and the device answers with what it applied."
      - "For files, a service that validates the device identity issues Ceph RGW presigned URLs scoped to `devices/<id>/` and to a few minutes."
      - "You need your own CA to issue and revoke certificates (step-ca, EJBCA or Vault PKI) and to publish a revocation list or an OCSP responder the broker checks."
      - "TimescaleDB brings compression and continuous aggregates, but those features are under the Timescale License, not Apache 2.0."
  aws:
    summary: "AWS IoT Core authenticates with X.509, keeps shadows with desired and reported state and routes through a rule to Kinesis Data Streams; Lambda writes to Timestream for InfluxDB and the credentials provider with a role alias gives temporary S3 access."
    notes:
      - "The credentials provider swaps the device certificate for STS credentials (15 minutes to 12 hours) and the IAM policy can use `${credentials-iot:ThingName}` to restrict each device to its own S3 prefix."
      - "Timestream for LiveAnalytics stopped accepting new customers on 20 June 2025; for new projects AWS recommends Timestream for InfluxDB, which has offered InfluxDB 3 Core and Enterprise since October 2025."
      - "Timestream for InfluxDB lives in your VPC: the ingestion Lambda needs VPC configuration and a route to the instance, and you pay per running instance."
      - "When consuming from Kinesis, enable partial batch failure reporting so you don't reprocess the whole batch, and key writes on (device, timestamp) so rewrites are harmless."
      - "IoT Core bills for connection minutes, messages, shadow operations and rule actions; Basic Ingest (`$aws/rules/...` topics) avoids the messaging charge when all you want is to feed a rule."
  azure:
    summary: "Azure IoT Hub authenticates with X.509, keeps device twins with desired and reported properties and routes to Event Hubs; Azure Functions ingests into Azure Data Explorer and file uploads use SAS URIs issued by IoT Hub itself."
    notes:
      - "IoT Hub is not a full MQTT broker: it implements a subset of MQTT 3.1.1 with fixed topics. If you need MQTT v5 or device-to-device publishing, the Event Grid MQTT broker covers it, but it has no device twins."
      - "Twins, cloud-to-device messages and device management only exist in the IoT Hub standard tier; the basic tier is for pure telemetry."
      - "File upload is built in: the device asks IoT Hub for a SAS URI, uploads to the linked storage account under its device ID and sends a completion notification."
      - "IoT Hub is billed per unit of a tier with a daily message quota metered in 4 KB blocks; pack readings into each message. IoT Central retires in 2029: don't start with it."
      - "Device Provisioning Service registers devices on first boot from a group certificate, with no manual enrolment per device."
  gcp:
    summary: "Google retired Cloud IoT Core on 16 August 2023, so the broker is EMQX on GKE; messages go to Pub/Sub, Cloud Run functions write to Bigtable, the twin lives in Firestore and files are uploaded to Cloud Storage with signed URLs."
    notes:
      - "With no managed IoT service, the broker, the device CA, the registry and the twin are yours; the alternative is a partner broker from Marketplace."
      - "EMQX needs a licence for clustering since 5.9; add it to the cost alongside the GKE nodes, which are a fixed cost even with no traffic."
      - "The Firestore twin uses one document per device with `desired`, `reported` and a version; a listener sends the delta to the device over MQTT when `desired` changes."
      - "For files, a Cloud Run service validates the device certificate and signs a short-lived Cloud Storage V4 URL for `devices/<id>/...`."
      - "In Bigtable the row key design is everything: `device#reversed_timestamp` spreads load and lets you read a device's latest values with a prefix scan."
tiers:
  - name: "Pilot"
    when: "A few hundred devices, one team and readings every minute."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: Mosquitto with mTLS, a worker writing straight to TimescaleDB and MinIO for files, no Kafka."
    aws: "IoT Core with a rule that invokes Lambda directly and writes to a single-instance Timestream for InfluxDB."
    azure: "A small standard-tier IoT Hub, routing to the built-in endpoint and Functions writing to a dev Data Explorer cluster."
    gcp: "Single-node EMQX on a VM, Pub/Sub, Cloud Run functions and single-node Bigtable, or BigQuery if queries are not latency-sensitive."
    tradeoffs: "With no intermediate stream, a slow consumer rejects or drops readings; a single broker is a single point of failure."
  - name: "Production fleet"
    when: "Thousands to tens of thousands of devices, several telemetry consumers and an availability SLA."
    cost: 2
    ops: 2
    onprem: "Kubernetes with clustered EMQX (licensed) or several Mosquitto instances per region, Strimzi for Kafka, KEDA for workers and highly available TimescaleDB."
    aws: "The diagram as drawn: IoT Core, shadows, Kinesis, Lambda, multi-AZ Timestream for InfluxDB and role-alias credentials."
    azure: "The diagram as drawn with a multi-unit IoT Hub, DPS, Event Hubs partitioned by device and Data Explorer."
    gcp: "The diagram as drawn: clustered EMQX on regional GKE, Pub/Sub, Cloud Run functions, autoscaling Bigtable and Firestore."
    tradeoffs: "Running your own broker on GCP and on-premises needs a team that knows MQTT, TLS and the CA; on AWS and Azure you pay per message."
  - name: "Global industrial fleet"
    when: "Hundreds of thousands of devices, plant gateways, several regions and sovereignty requirements."
    cost: 4
    ops: 3
    onprem: "Per-plant brokers bridged to a central cluster, Kafka replicated across sites and k3s gateways that filter and aggregate."
    aws: "IoT Core in several regions with fleet provisioning, Greengrass on gateways and Kinesis with Managed Service for Apache Flink."
    azure: "Several IoT Hubs per region with DPS spreading devices, IoT Edge in plants and Data Explorer or Fabric Eventhouse."
    gcp: "EMQX clusters on GKE per region, bridges from plants, global Pub/Sub and Dataflow for real-time aggregates."
    tradeoffs: "High cost and operations; identity decisions (CA, rotation) and where processing happens (edge or cloud) matter more than the choice of services."
extensions:
  - name: "Bulk provisioning"
    when: "When devices leave the factory and must register themselves on first boot."
    cost: "low"
    onprem: "Own CA + registration service"
    aws: "IoT Core fleet provisioning"
    azure: "Device Provisioning Service"
    gcp: "Own CA + Cloud Run registration"
  - name: "OTA updates"
    when: "When firmware or configuration must roll out in stages with rollback."
    cost: "low"
    onprem: "Mender or RAUC"
    aws: "AWS IoT Jobs"
    azure: "IoT Hub jobs + Mender"
    gcp: "Mender or own service"
  - name: "Edge processing"
    when: "When connectivity is poor or sending everything raw costs too much."
    cost: "medium"
    onprem: "k3s on the gateway"
    aws: "AWS IoT Greengrass"
    azure: "Azure IoT Edge"
    gcp: "k3s or GKE on the gateway"
  - name: "Real-time alerts"
    when: "When an out-of-range reading must trigger an action within seconds."
    cost: "medium"
    onprem: "Apache Flink on Kafka"
    aws: "Managed Service for Apache Flink"
    azure: "Azure Stream Analytics"
    gcp: "Dataflow"
  - name: "Raw archive"
    when: "When you need to reprocess or train models on the full history."
    cost: "low"
    onprem: "Kafka Connect to Ceph RGW"
    aws: "Data Firehose to S3"
    azure: "Event Hubs Capture"
    gcp: "Pub/Sub Cloud Storage subscription"
  - name: "Operations dashboards"
    when: "When operations need to see fleet health without writing queries."
    cost: "low"
    onprem: "Grafana"
    aws: "Amazon Managed Grafana"
    azure: "Data Explorer dashboards"
    gcp: "Grafana on GKE"
savings:
  - "Batch several readings per message on the device: both IoT Core and IoT Hub bill per message (IoT Hub in 4 KB blocks) and most readings are far smaller."
  - "On AWS, publish telemetry with Basic Ingest (`$aws/rules/<rule>`) so you don't pay publish/subscribe messaging when the only destination is a rule."
  - "Don't update the shadow or twin with every reading: it is for state and configuration, not telemetry, and every operation is billed."
  - "Apply retention and downsampling in the time-series database: raw data for a few days, per-minute or per-hour rollups for the rest, and a cheap archive in object storage."
  - "Use Kinesis on-demand while volume is irregular and switch to provisioned once it is steady; on Event Hubs, size throughput units with auto-inflate."
  - "Run ingestion functions on ARM (Graviton for Lambda) and use committed-use discounts for the broker's GKE nodes once the fleet is stable."
---

## When you need it

When you have devices in the field (sensors, PLCs, gateways, vehicles, meters) that send continuous readings and also need to receive configuration. An HTTP API with a shared key works for ten devices in a lab; a real fleet needs per-device identity, an efficient protocol for flaky connections, a way to change the configuration of a device that is switched off and a store built for time-ordered readings.

The clear signal is that the number of devices grows faster than the team's ability to manage them by hand, and someone asks what happens if one gets stolen.

## Scenarios

- **Hardware startup running a pilot.** A few hundred devices and one customer. Use the managed IoT service (AWS IoT Core or Azure IoT Hub) even if you move later: it gives you certificates, MQTT and shadows with nothing to run. No Kinesis or Event Hubs; the rule invokes the function directly.
- **Manufacturing where data stays in the plant.** One broker per plant and a gateway that aggregates and filters; only aggregates and alarms go to the cloud, or nothing at all if it's purely on-premises. The customer controls the device CA and the design must keep working for days without connectivity.
- **Smart meters with millions of readings a day.** Per-message cost dominates. Readings are batched on the device, basic ingest is used and older data is downsampled. A stream partitioned by device is essential to absorb mass reconnections after a network outage.
- **Standard company on Google Cloud.** With no IoT Core since 2023, the choice is to run a broker (EMQX on GKE) or buy one from a partner. Everything else (Pub/Sub, functions, Bigtable) is as managed as on the other clouds.
- **Medical or regulated equipment.** Per-device identity, immediate revocation, signed firmware and traceability of every configuration change. The twin becomes an auditable record.

## How it fits together

The device, or the gateway acting for it, opens an MQTT connection with mutual TLS: it presents its X.509 certificate and the broker validates it against the registered CA. The policy attached to that certificate limits topics to the device's own.

Published telemetry reaches the broker, which forwards it to a stream partitioned by device. The stream decouples: if ingestion slows down or fails, messages wait instead of being lost. The ingestion function reads batches, drops duplicates by (device, timestamp, sequence number) and writes to the time-series database. Since MQTT QoS 1 and the stream both deliver at least once, idempotency is not optional.

In parallel, the broker maintains the state registry: the cloud writes the **desired** state (sampling rate, thresholds, firmware version) and the device publishes its **reported** state. If they diverge while the device is offline, it receives the difference when it reconnects and applies it.

For large files (images, diagnostic dumps) the device doesn't use MQTT: it requests a temporary credential with its certificate and uploads straight to object storage, restricted to its own prefix.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** For a pilot or a lab: Mosquitto with mTLS and a per-device ACL file, a worker that subscribes and writes to TimescaleDB, MinIO for files with a small service that signs URLs, and Grafana behind Caddy. Volumes for TimescaleDB, MinIO and the CA (step-ca); daily `pg_dump` and bucket replication.

**On-premises Kubernetes (k3s or RKE2).** EMQX with its operator (licensed if clustered) or several Mosquitto instances behind an L4 load balancer with affinity, Strimzi for Kafka, KEDA to scale workers on topic lag, CloudNativePG with an image that includes TimescaleDB and cert-manager for server certificates. Device certificates come from your CA, not from cert-manager.

**Cloud without Kubernetes.** On AWS and Azure this is the natural path: IoT Core or IoT Hub, Kinesis or Event Hubs and functions. No servers except the time-series database. On GCP, with no managed broker, the Kubernetes-free variant is EMQX on a Compute Engine instance group behind a TCP load balancer.

**Managed Kubernetes (EKS, AKS, GKE).** The default on GCP, and it makes sense on AWS or Azure when you need a full MQTT broker (MQTT v5, device-to-device publishing) or want the same broker in the plant and in the cloud.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Very low | Medium | One broker | Pilot, lab |
| On-prem Kubernetes | High | High | Horizontal, licensed | Plant, sovereignty |
| Managed IoT service | Low, pay per message | Low | Automatic | AWS or Azure default |
| Managed Kubernetes | Medium | Medium | Horizontal | GCP, full broker |

## Key decisions

- **Managed IoT service or your own broker.** The managed service gives certificates, policies, shadows and scaling, and bills per message; your own gives full MQTT and portability in exchange for running the broker, CA and registry.
- **Shadow for state, stream for telemetry.** The shadow holds the latest state and configuration; the time series holds history. Mixing them makes both more expensive and more complex.
- **Time-series database.** InfluxDB and TimescaleDB shine with per-device, per-window queries; Data Explorer with ad hoc analysis over large volumes; Bigtable with massive writes and key lookups, but no analytical SQL.
- **Process at the edge or in the cloud.** Aggregating on the gateway cuts messages and cost; sending raw data lets you reanalyse later. Many fleets do both: aggregates over MQTT and raw data as files.
- **Own CA or the provider's.** Your own CA lets you switch clouds and sign at the factory; the provider's is simpler but ties you in.

## Common pitfalls

- One certificate shared by the whole fleet: when it leaks you can't revoke one device without locking out all of them.
- Policies that allow publishing to `#`: a compromised device injects data on behalf of others.
- Storing cloud access keys on the device to upload files instead of using temporary credentials.
- Non-idempotent ingestion that duplicates readings after every reconnection or batch retry.
- The whole fleet reconnecting at once after an outage, with no randomised exponential backoff on the device.
- Picking Timestream for LiveAnalytics or Cloud IoT Core by following old tutorials.
