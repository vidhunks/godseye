# GodsEye 👁️ - Project Status Report

* **Project**: GodsEye — MCP Server Inventory, Risk Scanner & Governance Graph
* **Repository**: [github.com/vidhunks/godseye](https://github.com/vidhunks/godseye)
* **Status**: 🚀 Deployment Phase (AWS HTTPS Integration)
* **Last Updated**: July 2026

---

## 1. Project Overview
GodsEye is an Enterprise AI Governance and Security Platform designed to provide deep visibility and operational control over Model Context Protocol (MCP) server usage across agent fleets. 

The platform passively intercepts connection streams, inventories active servers, evaluates multi-dimensional security postures, compiles interactive dependency graphs, and auto-generates OPA (Open Policy Agent) access rules to lock down high-risk endpoints.

Rather than treating these as separate utilities, the solution integrates two core domains into a single unified workspace:
1. **MCP Server Inventory & Risk Scanner**
2. **Governance Graph Builder**

---

## 2. Initial Research & Feasibility Study

Before implementation, extensive research was conducted to understand the underlying standards, architecture models, and security principles.

### A. Model Context Protocol (MCP)
- **MCP Client/Server Architecture**: Studied how JSON-RPC 2.0 communication acts as the transport layer over standard I/O (stdio) or Server-Sent Events (SSE).
- **Tool Discovery & Metadata**: Investigated the schema for `tools/list` and how context, schema properties, and required parameters are negotiated.
- **Capabilities & Authentication**: Researched transport security and the lack of native auth standards, identifying the critical need for a passive proxy gatekeeper.

### B. AI Agent Architecture
- **Brain Agent Orchestration**: Studied how single router models delegate sub-tasks to downstream functional agents (e.g. Finance, HR, DevOps agents).
- **Tool Execution Trajectory**: Analyzed runtime telemetry flow to track command executions and catch anomalies.

### C. AI Governance & Compliance
- **Asset Relationships**: Explored mapping schemas representing User ➔ Agent ➔ Proxy ➔ Server ➔ Tool ➔ Database.
- **Graph Databases (Evaluation)**:
  - *Options considered*: Neo4j vs. NetworkX.
  - *Selection*: **Neo4j**, chosen for its native graph storage, Cypher query efficiency, visual debugging interface, and scalable relationship modeling.

### D. Security & Risk Assessment
- Analyzed compliance indicators (Public exposure, unencrypted HTTP, presence of destructive CLI tools, lack of auditing).
- Chose a transparent, explainable **Rule-Based Scoring Engine** (0-100 scale) to calculate risk metrics.

---

## 3. Requirement Analysis & Architecture Design

Initially, the project was planned as two separate services. To streamline logs ingestion and secure connections dynamically, the architecture was consolidated into a single integrated gatekeeper platform.

```
          ┌────────────────────────────────────────────────────────┐
          │                      Sample Agents                     │
          └──────────────────────────┬─────────────────────────────┘
                                     │ Runtime stdio streams
          ┌──────────────────────────▼─────────────────────────────┐
          │               Transparent Proxy Interceptor            │
          └──────────────────────────┬─────────────────────────────┘
                                     │ Logs passive connection events
          ┌──────────────────────────▼─────────────────────────────┐
          │                  MCP Scanner Service                   │
          └──────────────────────────┬─────────────────────────────┘
                                     │ Computes threat dimensions
          ┌──────────────────────────▼─────────────────────────────┐
          │                   Compliance Risk Engine               │
          └──────────────────────────┬─────────────────────────────┘
                                     │ Persists nodes & edges
          ┌──────────────────────────▼─────────────────────────────┐
          │                   Neo4j Governance Graph               │
          └──────────────────────────┬─────────────────────────────┘
                                     │ Visualizes live posture
          ┌──────────────────────────▼─────────────────────────────┐
          │                     Control Dashboard                  │
          └───────────────────────────┬────────────────────────────┘
```

---

## 4. Technology Stack Selection

| Component | Selected Technology | Purpose |
| :--- | :--- | :--- |
| **Backend API** | FastAPI + Python 3.10 | High-performance async REST API, auto-docs |
| **Graph Database**| Neo4j 5.26 | Maps relationships and traverses threat paths |
| **Frontend UI** | React 18 + TypeScript + Vite | Dark-mode glassmorphic control dashboard |
| **Visualizer Engine**| Vis.js | Renders full-screen interactive topology charts |
| **Deployment** | Docker & Docker Compose | Containerized cross-platform orchestration |

---

## 5. Development Milestones

### A. Backend & Ingestion
- Created REST API routers (`/discovery`, `/governance`, `/events`).
- Integrated passive logging via transparent wrapper proxy `mcp_proxy.py` that intercepts JSON-RPC streams.
- Designed rule-based compliance validator matching four dimensions (Auth, Network, Tools, Auditing).

### B. Neo4j Integration
- Mapped complex relationship models linking user access tokens to tools and back.
- Built Cypher queries to resolve **Blast Radius** traversal and identify **Orphan Agents** (no policy attached).

### C. Frontend Overhaul
- Redesigned visualizer view to support a **full-screen overlaid layout** with glassmorphic cards.
- Integrated **dynamic SVG vector icons** (custom pods for Users, Orchestrators, Sub-Agents, Proxies, and databases with glowing threat halos).

---

## 6. Challenges Faced & Resolutions

### 1. Docker Daemon Inaccessibility
- *Problem*: Containers could not communicate or resolve local host networks during startup.
- *Resolution*: Configured internal Docker bridge network bindings and established strict container naming conventions.

### 2. Neo4j Connection Refused
- *Problem*: Backend app started faster than Neo4j initialization, causing startup crashes.
- *Resolution*: Implemented healthy check hooks in `docker-compose.yml` (`condition: service_healthy`) to ensure database read readiness before API boots.

### 3. Static Asset 404 Resolution
- *Problem*: Production build returned 404 for compiled CSS/JS assets.
- *Resolution*: Discovered asset location blocks in `nginx.conf` were missing `root` parameters. Added global `root` directive at the server block level.

---

## 7. Current Project Milestone Summary

| Milestone Phase | Sub-Phase Task | Status |
| :--- | :--- | :---: |
| **1. Requirements & Design** | Target Problem Definition |  Completed |
| | Architecture Layout Specification |  Completed |
| **2. Core Backend** | FastAPI Ingestion & API Routes |  Completed |
| | Rule-Based Risk Engine |  Completed |
| | Stdio Scanner Service |  Completed |
| **3. Database Layer** | Neo4j Integration & Modeling |  Completed |
| | Cypher Graph Queries |  Completed |
| **4. Security Proxy** | Pass-through Stdio Interceptor |  Completed |
| | Active Blocking Authorization Gate |  Completed |
| **5. Frontend UI** | React Dashboard Implementation |  Completed |
| | Vis.js Custom SVG Nodes View |  Completed |
| **6. Production Setup** | Multi-stage Dockerfiles |  Completed |
| | Local Docker Compose Setup |  Completed |
| **7. AWS Deployment** | VM Provisioning & Swap Enable |  In Progress |
| | DuckDNS Free Domain Mapping |  Pending |
| | Let's Encrypt HTTPS Integration |  Pending |

### Overall Progress Status: **92% Completed**
The core platform is functional, verified locally, and running successfully under Docker containers. The current focus is mapping the AWS HTTPS deployment using Certbot and DuckDNS.
