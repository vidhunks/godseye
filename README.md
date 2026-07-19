# GodsEye 👁️

**AI Agent Gatekeeper & MCP Server Risk Scanner**

GodsEye is an open-source governance and security platform for AI agent ecosystems. It discovers which MCP (Model Context Protocol) servers your agent fleet is connecting to, scans each server for security risks, builds a queryable governance graph of your entire AI infrastructure, and auto-generates OPA access policies to block high-risk servers.

---

## 🧩 What Problem Does It Solve?

As of 2026, thousands of MCP servers are reachable on the public internet — many without authentication. Most organisations have **no inventory** of which MCP servers their agents connect to, let alone whether those servers are safe.

GodsEye fixes this with two complementary modules:

| Module | What It Does |
|--------|-------------|
| **MCP Risk Scanner** | Discovers all MCP server connections, audits each for auth, TLS, public exposure, and dangerous tool exposure — then produces a risk card per server |
| **Governance Graph** | Builds a live Neo4j graph of Users → Agents → Proxies → MCP Servers → Tools → DataSources → Policies, making your full AI composition queryable in one place |

---

## ✨ Features

- 🔍 **MCP Server Inventory** — Automatically discovers all MCP servers connected to your agent fleet
- 🛡️ **Risk Cards per Server** — Auth status, TLS, public exposure, tool categories, risk score, and remediation steps
- 🕸️ **Governance Graph** — Interactive vis.js graph of your entire AI ecosystem in Neo4j with **dynamic SVG vector icons** (User, Agent, Proxy, Server, Tool) and active execution path halos
- 💥 **Blast Radius Calculator** — Given a compromised tool, find every user and agent potentially affected
- 🤖 **OPA Policy Generator** — Auto-generates Rego stubs that block access to HIGH risk MCP servers
- 🔒 **GodsEye Proxy Layer** — stdio interceptor sitting between agents and MCP servers; logs every tool call and enforces policy
- 📊 **Persistent Audit Logging** — Logs successful, failed, and blocked execution history in Neo4j (fully preserved across network clears)
- 👁️ **Visual Trajectory Auditor** — Interactive timeline path modal rendering the exact user-to-tool trace trajectory on clicking any log row
- 🧹 **Orphan Agent Detection** — Finds agents with no policy node attached
- 🎨 **Live Dashboard** — React/Vite frontend featuring full-screen visualizer canvas and glassmorphic overlay control panels

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Admin Dashboard                   │
│              React + Vite (localhost:3000)           │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  GodsEye Backend                     │
│              FastAPI (localhost:8000)                │
│                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │   Scanner   │  │ Risk Engine│  │ Neo4j Service│ │
│  │  (MCP client│  │ (scoring & │  │ (graph writes│ │
│  │   stdio)    │  │  findings) │  │  & queries)  │ │
│  └─────────────┘  └────────────┘  └──────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ Bolt
┌──────────────────────▼──────────────────────────────┐
│                     Neo4j Graph DB                   │
│                   (localhost:7687)                   │
└─────────────────────────────────────────────────────┘

Agent Runtime (separate processes):

 Admin → Brain Agent → GodsEye Proxy → Finance MCP Server
                     → GodsEye Proxy → HR MCP Server
                     → GodsEye Proxy → DevOps MCP Server
```

---

## 📁 Project Structure

```
godseye/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/routes/         # REST endpoints
│   │   │   ├── discovery.py    # /discovery/bootstrap, /discovery/scan-all
│   │   │   ├── governance.py   # /governance/risk-cards, /governance/opa-policy
│   │   │   └── events.py       # /events/ (proxy runtime log ingestion)
│   │   ├── scanner/            # MCP server scanner (connects via stdio)
│   │   ├── risk/               # Risk engine (scoring rules)
│   │   └── services/           # Neo4j write/query service
│   ├── .env.example            # Environment variable template
│   └── requirements.txt
│
├── frontend/                   # React + Vite dashboard
│   └── src/
│       ├── App.tsx             # Main dashboard component
│       └── index.css           # Styles
│
├── mcp_servers/                # Sample MCP servers
│   ├── finance_server/         # LOW risk (auth + TLS + audit enabled)
│   ├── hr_server/              # LOW risk (auth + TLS + audit enabled)
│   └── devops_server/          # HIGH risk (no auth, public, no TLS)
│
├── sample_agents/              # Sample AI agents
│   ├── brain_agent/            # Orchestrator (routes to sub-agents)
│   ├── finance_agent/          # Finance sub-agent
│   ├── hr_agent/               # HR sub-agent
│   └── devops_agent/           # DevOps sub-agent
│
└── scripts/
    └── mcp_proxy.py            # GodsEye stdio proxy interceptor
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend + MCP servers |
| Node.js | 18+ | Frontend dashboard |
| Neo4j | 5.x | Governance graph database |

### 1. Start Neo4j

**Docker (fastest):**
```bash
docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5
```

**Neo4j Desktop:** Download from [neo4j.com/download](https://neo4j.com/download/), create a DBMS with password `password`, and click Start.

Verify at [http://localhost:7474](http://localhost:7474)

### 2. Start the Backend

```bash
cd backend

# Create virtual environment (first time)
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn python-dotenv neo4j pydantic pydantic-settings mcp fastmcp

# Copy env template
cp .env.example .env
# Edit .env and set your Neo4j password

# Run the server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Run Your First Scan

1. Open the dashboard at [http://localhost:3000](http://localhost:3000)
2. Click **"Discover Agents"** — resets the graph database for a clean session
3. Click **"Scan Network"** — scans all 3 MCP servers and populates everything

That's it. You now have:
- ✅ Risk cards for Finance MCP, HR MCP, DevOps MCP
- ✅ Full governance graph in Neo4j
- ✅ OPA policy blocking DevOps MCP (HIGH risk)
- ✅ Blast radius showing compromise path through DevOps MCP

---

## 🔐 Risk Scoring

Each MCP server is scored 0–100 across four rule categories:

| Rule Category | Criteria | Max Points |
|---------------|----------|------------|
| **Authentication** | No auth = +20, weak auth = +5 | 25 |
| **Network** | Public internet = +25, no TLS = +10 | 35 |
| **Tool Capability** | DELETE/EXECUTE tools = +15, WRITE/DEPLOY = +10, HIGH risk tools = +15 | 20 (capped) |
| **Operational** | No audit log = +10, no owner = +2, no version = +2 | 14 |

| Score | Risk Level |
|-------|-----------|
| 0–34 | 🟢 LOW |
| 35–59 | 🟡 MEDIUM |
| 60–100 | 🔴 HIGH |

**Sample results from the three demo servers:**

| Server | Score | Level | Key Findings |
|--------|-------|-------|-------------|
| Finance MCP | 20 | 🟢 LOW | Auth + TLS + audit enabled; exposes write/delete tools |
| HR MCP | 20 | 🟢 LOW | Auth + TLS + audit enabled; exposes write/delete tools |
| DevOps MCP | 85 | 🔴 HIGH | No auth, public internet, no TLS, no audit log, exposes shell execution |

---

## 💥 Blast Radius Query

Given a compromised tool, GodsEye traces the full attack path through the graph:

```
execute_shell  ←  DevOps MCP  ←  GodsEye Proxy  ←  DevOps Agent  ←  Brain Agent  ←  Admin
```

**API:**
```
GET /governance/queries/blast_radius?tool_name=execute_shell
```

---

## 🏛️ Governance Graph Queries

| Query | Endpoint |
|-------|----------|
| Find all orphan agents (no policy) | `GET /governance/queries/orphan_agents` |
| List all datasource access | `GET /governance/queries/datasource_access` |
| Blast radius for a tool/server | `GET /governance/queries/blast_radius?tool_name=<name>` |
| Risk cards for all servers | `GET /governance/risk-cards` |
| OPA policy stub | `GET /governance/opa-policy` |
| Full graph data | `GET /governance/graph-data` |

---

## 🤖 OPA Policy Generation

GodsEye auto-generates an Open Policy Agent (OPA) Rego stub based on live risk scores:

```rego
package mcp.authz

default allow = false

allow {
  input.action == "call_tool"
  not is_high_risk_server(input.mcp_server)
}

is_high_risk_server(server) {
  server == "DevOps MCP"
}
```

---

## 🔌 GodsEye Proxy

The proxy (`scripts/mcp_proxy.py`) is a **transparent stdio interceptor**. It sits between an agent and an MCP server without modifying either's behaviour:

```bash
python mcp_proxy.py \
  --server ../../mcp_servers/devops_server/server.py \
  --server-name "DevOps MCP" \
  --agent "DevOps Agent" \
  --user "Admin" \
  --role "ADMIN"
```

- **Observe mode:** Logs every `tools/call` invocation to the backend (`POST /events/`)
- **Enforce mode:** If the server has a HIGH risk score, the proxy returns a JSON-RPC error directly — the tool call never reaches the server

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, vis.js |
| Backend | Python 3.10+, FastAPI, Uvicorn |
| Graph DB | Neo4j 5.x (Bolt protocol) |
| MCP | FastMCP, mcp SDK |
| Styling | Vanilla CSS (dark glassmorphism theme) |
| Policy | OPA Rego (generated stub) |

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙌 Contributing

Pull requests are welcome. For major changes, please open an issue first.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request
