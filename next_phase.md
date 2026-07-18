# GodsEye Compliance Checklist & Next Phase Roadmap

Here is the status breakdown of the requirements specified in the project specs relative to the current implementation.

---

## 1. Compliance Audit Status

### Challenge A: MCP Server Inventory & Risk Scanner

| Feature | Requirement | Status | Current Implementation Detail |
| :--- | :--- | :---: | :--- |
| **MCP Connection Passive Observer** | A proxy layer between agent and MCP, recording connections passively without changing agent behavior. | **Pending** | Currently, agents manually report execution details via standard `publish_event()` API calls. A transparent intercepting proxy for `stdio` or `SSE` transport streams is not yet built. |
| **Ecosystem Scanner** | Check authentication, tool lists, capabilities (read/write/delete), and network boundaries. | **Complete** | Refactored stdio scanner queries `get_governance_metadata()` and reads server configuration details. |
| **Risk Card Model** | Card per server (URI, tools, auth, write/delete capability, public exposure, risk tier). | **Complete** | Structured `ScannerResult` captures all these fields and saves them as properties in Neo4j. |
| **Dashboard UI** | Simple dashboard showing fleet exposure. | **Pending** | The `frontend` folder is empty. The project currently runs as a headless backend API with a CLI client. |
| **Bonus: OPA Policies** | Auto-generate OPA policy stubs restricting agent access to flagged high-risk servers. | **Pending** | Policy file stub generation logic is not yet implemented. |

---

### Challenge B: The Governance Graph Builder (Neo4j)

| Feature | Requirement | Status | Current Implementation Detail |
| :--- | :--- | :---: | :--- |
| **Graph Data Model** | Connected nodes representing: `User`, `Agent`, `Model`, `Tool`, `DataSource`, `Policy`. | **Partial** | Currently maps `Agent`, `MCPServer`, `Tool`, and `RiskAssessment`. Needs explicit support/fields for `Model`, `DataSource`, and `Policy` nodes. |
| **Ingestion Layer** | Build graph from agent configs, runtime execution logs, and manually authored policy documents. | **Partial** | Parses agent configs (via `/discovery/bootstrap`) and ingests runtime execution events (via `/events/`). Missing ingestion handler for policy documents. |
| **Compliance Queries** | Answer queries regarding agent tool access, model usage, data source access, and policy-free (orphan) agents. | **Pending** | Query APIs/scripts to return these statistics are not yet implemented. |
| **Visual Graph Render** | Render graph visualization in-app. | **Pending** | Relies on the default Neo4j Browser dashboard (`http://localhost:7474`) for rendering. |
| **Bonus: Blast Radius** | Calculate blast radius of a compromised tool. | **Pending** | Blast radius traversal logic is not yet written. |

---

## 2. Next Phase Implementation Roadmap

To fully satisfy all requirements, the following steps are proposed for the next phase of development:

### Step 1: Ingest Policy Documents & Models
- Implement a policy ingestion endpoint (e.g. `/governance/policy`) that parses OPA or YAML policy guidelines and creates `Policy` nodes in Neo4j.
- Update agent config files to declare the LLM model they use (e.g. `gpt-4`, `gpt-4o`) and link `(Agent)-[:USES_MODEL]->(Model)`.
- Update tool metadata configurations to declare target data catalogs/data sources (e.g. `financial_database`, `employee_records_db`) and link `(Tool)-[:ACCESSES]->(DataSource)`.

### Step 2: Implement Governance Queries
Add api routes (e.g. `/governance/queries`) returning:
- **Orphan Agents**: `MATCH (a:Agent) WHERE NOT (a)-[:HAS_POLICY]->() RETURN a`
- **Blast Radius**: `MATCH (t:Tool {name: $tool_name})<-[:EXPOSES]-(m:MCPServer)<-[:USES]-(a:Agent)<-[:ORCHESTRATES*0..]-(caller) RETURN a, caller`
- **Data Source Access**: `MATCH (a:Agent)-[:USES]->(m:MCPServer)-[:EXPOSES]->(t:Tool)-[:ACCESSES]->(d:DataSource) RETURN a, d`

### Step 3: Implement OPA Policy Generator
- Write a generator utility that reads high-risk assessments (`RiskAssessment {level: "HIGH"}`) and exports Open Policy Agent Rego stubs:
  ```rego
  package godseye.authz
  default allow = false
  allow {
      input.action == "execute"
      input.mcp_server != "DevOps MCP" # Exclude high-risk servers
  }
  ```

### Step 4: Build Dashboard UI (Frontend)
Initialize a React/Vite dashboard in [frontend](file:///f:/godseye/frontend) displaying:
- Total exposure surface (total servers, high-risk counts, unauthenticated counts).
- Interative canvas rendering the Neo4j topology.
