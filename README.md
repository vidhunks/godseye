# GodsEye 👁️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-blue.svg)](https://neo4j.com/)

**The Enterprise AI Governance, Audit, & Security Control Plane for Agentic Fleet and Model Context Protocol (MCP) Ecosystems.**

GodsEye is a comprehensive security gatekeeper for AI Agent clusters. It auto-discovers agent configurations, inventories active MCP server exposures, logs runtime execution trajectories persistently, computes multi-dimensional compliance risk tiers, and generates Open Policy Agent (OPA) access rules to block high-risk capabilities before they threaten enterprise resources.

---

## 🧩 The Security Gap in Agentic AI

In modern enterprise architectures, AI agents connect to diverse **Model Context Protocol (MCP)** servers to read databases, write logs, edit code, and trigger deployments. Many of these servers run with **no authentication**, expose **destructive shell commands** to LLMs, and lack **audit trails**. 

Organizations suffer from **zero visibility** into what capabilities their agent fleets are utilizing.

**GodsEye fixes this by introducing a transparent security and audit wrapper:**

```
                        ┌────────────────────────┐
                        │      Human Admin       │
                        └───────────┬────────────┘
                                    │ Prompts/Tasks
                        ┌───────────▼────────────┐
                        │   Brain Agent Router   │
                        └─────┬────────────┬─────┘
                              │            │
            ┌─────────────────┘            └─────────────────┐
 ┌──────────▼──────────┐                         ┌───────────▼──────────┐
 │    Finance Agent    │                         │     DevOps Agent     │
 └──────────┬──────────┘                         └───────────┬──────────┘
            │                                                │
 ┌──────────▼──────────┐                         ┌───────────▼──────────┐
 │ GodsEye Stdio Proxy │                         │ GodsEye Stdio Proxy  │
 │  (Passive Logger)   │                         │  (Active Block Gate) │
 └──────────┬──────────┘                         └───────────┬──────────┘
            │ stdio pipe                                     │ BLOCKED (OPA Rule)
 ┌──────────▼──────────┐                         ┌───────────✕──────────┐
 │  Finance MCP Server │                         │  DevOps MCP Server   │
 └─────────────────────┘                         └──────────────────────┘
```

---

## ✨ Features

- 🔍 **Ecosystem Discovery & Inventory** — Auto-scans all registered MCP servers. Logs TLS status, authentication headers, public accessibility, and exposed tools.
- 🛡️ **Rule-Based Risk Assessment** — Scores servers from `0-100` across four key security dimensions: Authentication, Network Exposure, Tool Category, and Operational Auditing.
- 🕸️ **State-of-the-Art Governance Graph** — Interactive vis.js map visualizing connections from `User` ➔ `Agent` ➔ `Proxy` ➔ `Server` ➔ `Tool` ➔ `DataSource`. Features custom SVG vector nodes, glowing halos, and dynamic trace highlighting.
- 👁️ **Visual Trajectory Auditor** — Double-click any persistent execution log row to pop up an animated step-by-step path detailing exactly how the command flowed.
- 💥 **Blast Radius Engine** — Graph-traversal queries that identify every user, agent, and server exposed to a specific tool in the event of credential leakage or compromised models.
- 🤖 **Automated OPA Policy Generation** — Compiles Rego files to dynamically authorize agent-to-tool bindings based on live risk assessments.
- 📊 **Persistent Execution Logs** — Robust log ingestion layer that persists successful, blocked, and failed agent events across scans and reboots.

---

## 🏗️ Architecture

GodsEye is built on a containerized, decoupled architecture:

1. **Dashboard (React 18 + Vite)**: A premium glassmorphism dark-mode UI displaying risk scores, logs, blast-radius control tools, and the visualizer canvas.
2. **Control Plane (FastAPI)**: Ingests logs, runs OPA code compilers, executes graph queries, and discovers static network configurations.
3. **Graph Database (Neo4j)**: Persists entities and traces relationships.
4. **Transparent Proxy (`mcp_proxy.py`)**: Intercepts JSON-RPC standard I/O packets between agents and servers to report events and block tasks.

---

## 📁 Repository Structure

```
godseye/
├── backend/
│   ├── app/
│   │   ├── api/routes/         # REST API endpoints (governance, events, discovery)
│   │   ├── scanner/            # Stdio-based MCP metadata scanner
│   │   ├── risk/               # Scoring calculator (0-100 risk rules)
│   │   └── services/           # Neo4j Graph Database Bolt wrapper
│   ├── Dockerfile              # Light python runner container
│   └── requirements.txt        # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Vis.js graph + Logs list + Admin Dashboard
│   │   └── index.css           # Glowing overlays & glass styles
│   ├── nginx.conf              # Nginx server configuration with proper root directives
│   └── Dockerfile              # Multi-stage production container build
│
├── infrastructure/
│   └── docker-compose.yml      # Orchestrates Neo4j, backend, and frontend
│
├── mcp_servers/                # Sample servers (Finance, HR, DevOps)
├── sample_agents/              # Sample agents (Brain Agent orchestrator + subs)
└── scripts/
    └── mcp_proxy.py            # stdio packet interceptor wrapper
```

---

## 🚀 Quick Start (Local Docker Compose)

Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

### 1. Configure the Environment
Copy the backend config file template:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and insert your **Groq API Key** (or OpenAI API Key) for LLM routing fallback, along with your secure database credentials.

### 2. Start the Fleet
Run the docker compose file from the `infrastructure/` directory:
```bash
cd infrastructure
docker compose up --build -d
```

Verify that all three core services are up:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Neo4j Browser Console**: [http://localhost:7474](http://localhost:7474) (Username: `neo4j`, Password: `password`)

### 3. Run the Initial Audit
1. Navigate to the dashboard at [http://localhost:3000](http://localhost:3000).
2. Click **"Discover Agents"** to bootstrap the network.
3. Click **"Scan Network"** to trigger a recursive capability sweep.
4. Your dashboard will now populate with active **Risk Cards**, the **Ecosystem Governance Graph**, and **OPA Policy Stubs**.

---

## 🛡️ Governance Risk Model (0-100 Scoring)

The Compliance Risk Calculator evaluates every discovered MCP server based on strict weights:

| Category | Finding | Score Penalty |
| :--- | :--- | :---: |
| **Authentication** | No authentication configured | **+20** |
| | Weak/Basic Auth token | **+5** |
| **Network** | Bound to public internet (0.0.0.0) | **+25** |
| | Unencrypted transport protocol (HTTP/stdio) | **+10** |
| **Capabilities** | Exposes administrative commands (`execute_shell`, `deploy`) | **+15** |
| | Exposes destructive commands (`delete`, `remove`) | **+10** |
| **Operational** | No logging/audit endpoint exposed | **+10** |
| | Missing metadata fields (Owner, Version) | **+4** |

### Evaluated Risk Thresholds
- 🟢 **0–34**: **LOW Risk** (Finance and HR servers run with TLS, Auth, and active auditing).
- 🟡 **35–59**: **MEDIUM Risk**.
- 🔴 **60–100**: **HIGH Risk** (DevOps server lacks authentication, binds to public interfaces, and exposes shell executors).

---

## 🔌 GodsEye Interceptor Proxy

The proxy script (`scripts/mcp_proxy.py`) sits silently as a standard I/O pipe wrapper between your LLM Agent framework (LangChain, AutoGen, etc.) and the target MCP server:

```bash
python mcp_proxy.py \
  --server ../../mcp_servers/devops_server/server.py \
  --server-name "DevOps MCP" \
  --agent "DevOps Agent" \
  --user "Admin" \
  --role "ADMIN" \
  --enforce
```

### Modes of Operation
- **Observe (Passive)**: Intercepts outgoing `tools/call` JSON-RPC requests, parses the calling parameters, logs them to `/events/` database endpoint, and pipes the result cleanly back.
- **Enforce (Active)**: Queries OPA policies beforehand. If the tool call violates security settings (e.g. executing shell commands from a high-risk server), the proxy blocks the stream and returns a structured JSON-RPC error.

---

## 🏛️ Cypher Graph Queries (Neo4j)

GodsEye resolves advanced security questions using Neo4j graph traversals:

### 1. Blast Radius Query
Given a compromised server or tool name, trace the complete dependency hierarchy to see which agents and users are affected:
```cypher
MATCH path = (u:User)-[*0..6]->(m:MCPServer)-[:EXPOSES]->(t:Tool {name: "execute_shell"})
RETURN path
```

### 2. Orphan Agent Discovery
Find agents running in your ecosystem that have no governance policy attached:
```cypher
MATCH (a:Agent)
WHERE NOT (a)-[:HAS_POLICY]->(:Policy)
RETURN a.name AS orphan_agent
```

### 3. Excluded Audit Scans
Since execution logs must persist historically, database bootstrap detaches exclude execution nodes:
```cypher
MATCH (n)
WHERE NOT n:ExecutionLog
DETACH DELETE n
```

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
