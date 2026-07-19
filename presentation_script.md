# GodsEye Presentation Script (5-7 Minutes)

This presentation is structured for technical panels, stakeholders, or enterprise security architects.

---

## ⏱️ Timeline Breakdown
1. **0:00 - 1:00** | **The Hook**: The Unseen Security Crisis of Agentic AI
2. **1:00 - 2:00** | **Introducing GodsEye**: The Gatekeeper Concept
3. **2:00 - 3:30** | **Deep Dive**: Transparent Interceptor Proxy Mechanics
4. **3:30 - 4:30** | **The Graph Engine**: Neo4j Governance & Blast Radius Traversal
5. **4:30 - 5:30** | **The Dashboard**: Live Trajectory Auditor & Vis.js Custom SVGs
6. **5:30 - 6:30** | **Production & Deployment**: Multi-stage Docker & AWS Configuration
7. **6:30 - 7:00** | **Closing Summary & Panel Hook**

---

## 🎙️ Section-by-Section Script

### 1. The Hook: The Unseen Security Crisis of Agentic AI (1 Minute)
> **[Slide: The Problem Statement - Agentic Blind Spots]**
>
> "Good morning, everyone. In 2026, we are witnessing an unprecedented shift from chat-based assistants to fully autonomous, Agentic AI. Today, AI agents are performing financial reports, managing human resources, and deploying production code. To do this, they rely on the **Model Context Protocol (MCP)**—connecting to specialized backend servers that read databases and execute terminal commands.
>
> But this capability exposes a critical security crisis. In most organizations, these MCP connections are completely invisible. Many internal servers run on localhost with **no authentication**, they expose dangerous shell execution commands directly to LLMs, and they provide **zero centralized auditing**. 
>
> If an LLM hallucinates, is prompted with a prompt injection attack, or if credentials leak, an agent can be manipulated into wiping databases or compromising the local network. We are operating agentic fleets in absolute darkness."

---

### 2. Introducing GodsEye: The AI Governance Gatekeeper (1 Minute)
> **[Slide: GodsEye - The Gatekeeper Architecture]**
>
> "This is why we built **GodsEye**. GodsEye is a comprehensive, enterprise-ready security control plane and passive gatekeeper designed specifically for Agentic fleets and MCP ecosystems.
>
> Instead of trying to modify the agent's internal reasoning or rewrite target MCP servers, GodsEye introduces a transparent security boundary. The platform is built around three core pillars:
> 1. **An automated inventory scanner** that audits server schemas, transport parameters, and auth requirements.
> 2. **A passive stdio interceptor proxy** that logs and authorizes JSON-RPC command streams in real time.
> 3. **A live Neo4j graph database engine** that maps and queries the entire composition of your AI assets."

---

### 3. Deep Dive: Transparent Interceptor Proxy Mechanics (1.5 Minutes)
> **[Slide: Stdio Proxy & Active Enforcement Gateway]**
>
> "Let’s look at how the data flows. In standard setups, agents spawn MCP servers directly as subprocesses. In GodsEye, we insert a transparent proxy layer using `mcp_proxy.py`. 
>
> As standard I/O packets pass between the agent and the server, our proxy inspects the payload in milliseconds. If the agent calls a tool, the proxy reads the JSON-RPC request.
>
> - **In Observe Mode**, it logs the call (User, Agent, Tool, Server, Timestamp) asynchronously to our backend events server, ensuring a complete audit trail without adding latency to the pipeline.
> - **In Enforce Mode**, it checks the compliance engine first. If a DevOps agent tries to execute a shell command on an unauthenticated, publicly exposed server, the proxy actively blocks the stream. It intercepts the request and injects a custom JSON-RPC error response directly back to the agent client. The server never even receives the execution packet."

---

### 4. The Graph Engine: Neo4j & Blast Radius Traversal (1 Minute)
> **[Slide: The Governance Graph Model]**
>
> "To query this ecosystem effectively, we chose **Neo4j** over traditional relational databases. Our graph database models the entire AI infrastructure, linking `User ➔ Agent ➔ Proxy ➔ MCPServer ➔ Tool ➔ DataSource ➔ Policy`.
>
> This lets us run advanced security queries that are impossible with standard tables. For example:
> 1. **Blast Radius Analysis**: If a developer’s API key is compromised, or a tool is flagged as vulnerable, we traverse the graph upstream to locate every user and agent exposed to that vulnerability.
> 2. **Orphan Detection**: We instantly isolate 'orphan agents'—agents operating without any attached security policies.
> 3. **Exempt Log Ingestion**: When database configurations are cleared or rescanned, historical execution log nodes are preserved dynamically, preventing log spoofing."

---

### 5. The Visual Experience: Trajectory Auditor & Vis.js Custom SVGs (1 Minute)
> **[Slide: Live Glassmorphic Control Dashboard]**
>
> "All of this complexity is managed through a dark-mode, glassmorphic React dashboard. The interface is designed for security operations centers:
>
> - **Full-Screen Topology Graph**: Built using Vis.js, it avoids generic nodes. Instead, it generates SVG vectors on the fly, rendering styled circular pods for agents, servers, and tools. Active execution paths are outlined with crawling dashed connectors and glowing orange halos.
> - **Visual Trajectory Auditor**: When auditing logs, a double-click on any row triggers an animated visual timeline. It maps the path (User ➔ Brain Agent ➔ Sub-Agent ➔ Proxy ➔ Server ➔ Tool), rendering green indicators for success and red for blocked operations. This makes security audits highly interactive and explainable."

---

### 6. Production & Deployment: Multi-stage Docker & AWS Configuration (1 Minute)
> **[Slide: Cloud Infrastructure & Cost Optimization]**
>
> "Finally, we designed GodsEye for immediate deployment. The entire application is containerized with multi-stage Dockerfiles:
> - **Backend**: Lightweight Python image running FastAPI.
> - **Frontend**: Multi-stage Node.js build served via custom Nginx configurations.
>
> We optimized the stack to run comfortably on a budget-friendly **AWS EC2 `t3.small` instance** (costing less than $100). Because Vite compilation and Neo4j can be memory-heavy, our deployment guide configures a **2GB swap space** on the host. Traffic is mapped to a free domain via **DuckDNS** and secured with **Let's Encrypt SSL certificates**, automatically proxying traffic securely via HTTPS."

---

### 7. Closing Summary & Panel Hook (30 Seconds)
> **[Slide: Secure Your AI Ecosystem]**
>
> "To conclude, GodsEye transitions Agentic AI from an unmonitored shadow IT risk into a secure, fully auditable corporate asset. It brings visibility, active policy enforcement, and visual explainability to the emerging Model Context Protocol standard.
>
> Thank you, and I am happy to open the floor to any questions."
