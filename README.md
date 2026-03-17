# Webhook Router & Event Pipeline

A serverless, event-driven platform that receives webhooks from external services (GitHub, Stripe, or any HTTP source), applies configurable routing rules, and dispatches events to destinations like Slack, email, or custom HTTP endpoints.

Built to demonstrate production-grade backend engineering: serverless architecture, event-driven design, infrastructure as code, and automated CI/CD deployment to AWS.

---

## Why This Exists

Modern software stacks are made of dozens of services that need to talk to each other. When Stripe processes a payment, when GitHub merges a pull request, when a monitoring tool detects an error — something needs to listen, decide what to do, and act.

The naive solution is to hardcode that logic into every application. The better solution is a dedicated routing layer that any service can plug into.

This project is that routing layer. Any external service can POST a webhook to it. You define rules — "if the event is a Stripe payment, notify this Slack channel and log to S3" — and the platform handles delivery, retries, and failure management automatically.

---

## Architecture

```
External Sources        :  AWS Infrastructure                                                        :  Destinations
─────────────────       :  ────────────────────────────────────────────────────────────────────────  : ───────────────────
GitHub                  :                                                                            :
Stripe           ───────:──►  API Gateway  ──►  Ingest λ  ──►  SQS  ──►  Router λ  ──►  Dispatch λ  ─:────►  Slack
Any HTTP POST           :                    │                        │                              :       Email
                        :                    │                        │                              :       Webhook
                        :                    └──────────────► DynamoDB ◄──────────────────────────── : ───── S3
```


### Components

**API Gateway** — Single HTTPS entry point. Authenticates requests and forwards them to the Ingest function.

**Ingest Function (Lambda)** — Validates the webhook signature (HMAC), logs the raw event to DynamoDB with status `PENDING`, and immediately returns `202 Accepted`. This decouples the sender from all downstream processing.

**SQS Queue** — Acts as the buffer between ingestion and processing. Guarantees no event is lost, even if downstream functions are temporarily unavailable. Failed deliveries go to a Dead Letter Queue.

**Router Function (Lambda)** — Triggered by SQS. Reads the tenant's routing rules from DynamoDB and determines which destinations should receive the event.

**Dispatch Function (Lambda)** — Calls each destination (Slack, HTTP endpoint, S3). Implements retry logic with exponential backoff. Records delivery status back to DynamoDB.

**DynamoDB** — Stores routing rules per tenant and the full audit log of every event and delivery attempt.

---

## Key Engineering Concepts

**Decoupled ingestion** — The system responds to the webhook sender immediately without waiting for processing to complete. This prevents timeouts and handles traffic spikes gracefully.

**At-least-once delivery** — SQS guarantees every event will be processed. If a function crashes mid-execution, the event is retried automatically.

**Idempotency** — Each event carries a unique ID. Dispatch checks this ID before acting to prevent duplicate notifications when retries occur.

**Dead Letter Queue** — Events that fail after all retries are moved to a DLQ for inspection and manual replay, ensuring nothing is silently dropped.

**Infrastructure as Code** — All AWS resources (Lambdas, SQS queues, DynamoDB tables, IAM roles) are defined in Terraform. The entire stack can be created or destroyed with a single command.

---

## Local Development

The local environment uses Docker Compose to simulate the full AWS stack without any cloud costs.

**Services:**
- `localstack` — Simulates AWS services (SQS, DynamoDB, API Gateway) at `localstack:4566`
- `backend` — Node.js 18 container with volume-mounted source code and hot reload via `nodemon` + `ts-node`

```bash
docker compose up
```

All AWS SDK calls in development point to `http://localstack:4566` instead of real AWS endpoints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 + TypeScript |
| Functions | AWS Lambda |
| Queue | AWS SQS |
| Database | AWS DynamoDB |
| API | AWS API Gateway |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Local dev | Docker Compose + LocalStack |

---

## Project Structure

```
.
├── docker-compose.yml
└── server/
    ├── index.ts
    ├── package.json
    ├── tsconfig.json
    ├── functions/
    │   ├── ingest.ts
    │   ├── router.ts
    │   └── dispatch.ts
    ├── models/
    └── utils/
```

---

## 7-Day Build Plan

### Day 1 — Scaffolding & Local Environment
Set up the monorepo structure, TypeScript configuration, and Docker Compose environment with LocalStack. Define core domain types: `WebhookEvent`, `Route`, `DeliveryAttempt`.

### Day 2 — Ingest Function + API Gateway
Build the ingest Lambda: validate HMAC signatures, persist raw events to DynamoDB with status `PENDING`, return `202 Accepted` immediately. First manual deploy to AWS.

### Day 3 — Event Queue + Router Function
Connect DynamoDB Streams or SQS to the Router function. Implement the rules engine: read tenant routing configuration and fan out to the appropriate destinations.

### Day 4 — Dispatch Function + Retry Logic
Build the Dispatch function with exponential backoff retry. Route failed events to the Dead Letter Queue. Implement idempotency checks using the event ID.

### Day 5 — Infrastructure as Code with Terraform
Codify all manually created AWS resources into Terraform. Define IAM roles with least-privilege permissions. Parameterize for `dev` and `prod` environments.

### Day 6 — CI/CD with GitHub Actions
Build the full pipeline: lint → tests → `terraform plan` on pull request → `terraform apply` + Lambda deploy on merge to `main`. Configure GitHub secrets for AWS credentials.

### Day 7 — Polish & Portfolio Documentation
Write professional README with architecture diagram. Configure a live demo endpoint. Record a short demo showing a GitHub webhook triggering a Slack notification end-to-end.

---

## Deployment

```bash
# Bootstrap infrastructure
terraform init
terraform apply

# Deploy functions
npm run deploy

# Destroy everything
terraform destroy
```

---

## What This Demonstrates

This project is intentionally backend-heavy. The focus is on the infrastructure patterns that power real production systems:

- Designing for failure at every layer
- Decoupling systems with async messaging
- Making infrastructure reproducible and version-controlled
- Automating deployment so humans don't touch production manually

These are the skills that separate engineers who can build features from engineers who can build systems.
