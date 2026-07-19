# GodsEye 👁️
### **The Enterprise AI Governance, Audit, & Security Control Plane for Agentic Fleet and Model Context Protocol (MCP) Ecosystems.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-blue.svg)](https://neo4j.com/)

GodsEye is a comprehensive security gatekeeper and auditing plane designed to govern, inspect, and authorize AI Agent clusters interacting with Model Context Protocol (MCP) servers. 

The platform passively intercepts standard input/output streams, inventories active servers, evaluates multi-dimensional security postures, compiles interactive dependency graphs, and auto-generates Open Policy Agent (OPA) access rules to lock down high-risk endpoints.

---

## 🧩 The Security Gap in Agentic AI

Model Context Protocol (MCP) is the emerging standard for connecting LLM agents to data sources and tools. However, it introduces significant corporate vulnerability:
1. **Unauthenticated Endpoints**: Many internal MCP servers run on localhost or private subnets without any authentication.
2. **Over-privileged Commands**: Servers expose dangerous administrative tools (e.g. `execute_shell`, `restart_server`, `delete_logs`) directly to LLMs.
3. **Zero Auditing**: Standard LLM integrations have no central audit trails recording which user prompted which agent to execute which database command.

### GodsEye Solution:
By placing a transparent **Stdio Interceptor Proxy** between the agent client and the server process, GodsEye intercepts execution requests on the fly. It queries OPA policies, publishes audit events, and injects clean JSON-RPC error responses if a high-risk tool call is unauthorized.

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

## ✨ Core Features

- 🔍 **MCP Server Auto-Discovery & Scanning** — Recursively crawls configuration folders, maps active servers, queries capabilities, and parses standard metadata using the `get_governance_metadata()` protocol.
- 🛡️ **Rule-Based Risk Analyzer** — Assesses servers on a `0-100` score using factors like auth rules, TLS encryption, public subnet mapping, and destructive tool categories.
- 🕸️ **Futuristic Governance Graph** — Vis.js visualization engine displaying connections from `User` ➔ `Agent` ➔ `Proxy` ➔ `Server` ➔ `Tool` ➔ `DataSource`. Features custom dynamic SVG vector shapes, glowing halos, and dynamic trace highlighting.
- 👁️ **Visual Trajectory Auditor** — Double-click any persistent execution log row to pop up an animated path modal mapping exactly how the request flowed from the user to the command.
- 💥 **Blast Radius Engine** — Graph-traversal queries that identify every user, agent, and server exposed to a specific tool in the event of credential leakage or compromised models.
- 🤖 **Automated OPA Policy Generation** — Compiles Rego files to authorize agent-to-tool bindings based on live risk assessments.
- 📊 **Persistent Execution Logs** — Ingestion layer that persists successful, blocked, and failed agent events in Neo4j across database sweeps.

---

## 🏗️ Technical Architecture

GodsEye is organized into a modular structure:

1. **Dashboard (React 18 + Vite)**: A premium glassmorphism dark-mode UI displaying risk scores, logs, blast-radius control tools, and the visualizer canvas.
2. **Control Plane (FastAPI)**: Ingests logs, runs OPA code compilers, executes graph queries, and discovers static network configurations.
3. **Graph Database (Neo4j)**: Persists entities and traces relationships.
4. **Transparent Proxy (`mcp_proxy.py`)**: Intercepts JSON-RPC standard I/O packets between agents and servers to report events and block tasks.

---

## 📁 Repository Structure & Code Analysis

### Directory Layout
```
godseye/
├── backend/
│   ├── app/
│   │   ├── api/routes/         # REST API endpoints (governance, events, discovery)
│   │   │   ├── discovery.py    # Auto-scans workspaces and registers nodes
│   │   │   ├── events.py       # Ingests telemetry logs from proxy wrappers
│   │   │   └── governance.py   # OPA generator, blast radius queries, execution logs
│   │   ├── scanner/            # Connects to servers via stdio client to audit schemas
│   │   ├── risk/               # Calculates 0-100 risk score and recommendations
│   │   └── services/           # Neo4j Graph Database Bolt wrapper
│   ├── Dockerfile              # Python API container running FastAPI + Uvicorn
│   └── requirements.txt        # Backend dependencies (fastapi, neo4j, mcp, fastmcp)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main entry point housing Vis.js full-screen graph
│   │   └── index.css           # Custom glass CSS, visualizer animations, crawling paths
│   ├── nginx.conf              # Production Nginx reverse-proxy configuration
│   └── Dockerfile              # Multi-stage Vite build + Nginx static serving
│
├── infrastructure/
│   └── docker-compose.yml      # Orchestrates neo4j, backend, and frontend
│
├── mcp_servers/                # Sample servers (Finance, HR, DevOps)
│   ├── devops_server/          # HIGH risk (exposes shell command execution, no auth)
│   ├── finance_server/         # LOW risk (auth, audit, TLS, limited scopes)
│   └── hr_server/              # LOW risk (auth, audit, TLS, limited scopes)
│
├── sample_agents/              # Sample agents (Brain Agent orchestrator + subs)
└── scripts/
    └── mcp_proxy.py            # stdio packet interceptor wrapper
```

---

## 🔌 GodsEye Interceptor Proxy (`mcp_proxy.py`)

The proxy wrapper runs inline as a pass-through layer:

```bash
python mcp_proxy.py \
  --server ../../mcp_servers/devops_server/server.py \
  --server-name "DevOps MCP" \
  --agent "DevOps Agent" \
  --user "Admin" \
  --role "ADMIN"
```

### Protocol Interception Mechanics
When the agent sends a JSON-RPC request:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "execute_shell",
    "arguments": {"command": "rm -rf /logs"}
  },
  "id": 1
}
```
1. **Security Policy Check**: If the target server is marked as `HIGH` risk, the proxy immediately drops the request.
2. **Error Injection**: It writes a custom JSON-RPC error payload back to the agent stdout:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "error": {
       "code": -32602,
       "message": "Access Denied by GodsEye Policy: Server 'DevOps MCP' has HIGH risk score."
     }
   }
   ```
3. **Security Logging**: It POSTs a `BLOCKED` event to the backend events server asynchronously without blocking the stream.

---

## 🛡️ Governance Risk Model (0-100 Scoring)

The `RiskEngine` class evaluates every discovered server based on strict weights:

| Check Category | Criteria | Points Added |
| :--- | :--- | :---: |
| **Base Configuration** | Starting initial score | **10** |
| **Authentication** | Authentication disabled (`enabled = False`) | **+30** |
| **Encryption** | TLS transport disabled (`tls_enabled = False`) | **+30** |
| **Exposure** | Publicly reachable (`publicly_reachable = True`) | **+10** |
| **Capabilities** | Exposes tools in `DELETE` or `EXECUTE` category | **+20** |

- 🟢 **0–34 (LOW Risk)**: e.g., Finance & HR servers (have Auth, TLS, audit logs).
- 🟡 **35–59 (MEDIUM Risk)**.
- 🔴 **60–100 (HIGH Risk)**: e.g., DevOps server (exposes execution shell, has no auth/TLS).

---

## 🏛️ Cypher Graph Queries (Neo4j)

GodsEye maps security posture into a highly traversable structure:

### 1. Active Threat Path Highlight
Find the last executing tool path to highlight on the visualization canvas:
```cypher
MATCH (m:MCPServer)-[c:CALLS]->(t:Tool)
WITH m, t, c ORDER BY c.timestamp DESC LIMIT 1
MATCH path = (u:User)-[*0..6]->(m)
RETURN id(t) AS tool_id, [node in nodes(path) | id(node)] AS node_ids
```

### 2. Execution Log Detach Exemption
When clearing active network maps, preserve historical run logs:
```cypher
MATCH (n)
WHERE NOT n:ExecutionLog
DETACH DELETE n
```

---

## 🚀 Local Quick Start (Docker Compose)

### 1. Configuration
Copy the configuration template:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` to configure your LLM keys (`GROK_API_KEY` or `OPENAI_API_KEY`) and secure passwords.

### 2. Run the Stack
Build and spin up the containerized network:
```bash
cd infrastructure
docker compose up --build -d
```

Verify that all three core services are up:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Neo4j Browser Console**: [http://localhost:7474](http://localhost:7474) (Username: `neo4j`, Password: `password`)

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
