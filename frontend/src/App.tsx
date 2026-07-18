import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  Activity,
  Database,
  Search,
  BookOpen,
  Network,
  Download,
  AlertTriangle,
  Play,
  FileCode,
  User,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Terminal,
  RefreshCw,
  ArrowLeft,
  Server
} from 'lucide-react'

const API_BASE = '/api'

declare const vis: any;

export default function App() {
  const [currentView, setCurrentView] = useState<'console' | 'graph'>('console')
  const [activeSubTab, setActiveSubTab] = useState<'compliance' | 'policy' | 'opa'>('compliance')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null)

  // OPA and Risk Assessment Fleet states
  const [opaPolicy, setOpaPolicy] = useState('')
  const [riskCards, setRiskCards] = useState<any[]>([])

  // Console execution states
  const [promptInput, setPromptInput] = useState('Run DevOps deploy and restart logs command')
  const [selectedAgent, setSelectedAgent] = useState('Brain Agent')
  const [executionOutput, setExecutionOutput] = useState('')
  const [executing, setExecuting] = useState(false)

  // Compliance query states
  const [orphanAgents, setOrphanAgents] = useState<string[]>([])
  const [datasourceAccess, setDatasourceAccess] = useState<any[]>([])
  const [blastTool, setBlastTool] = useState('execute_shell')
  const [blastRadius, setBlastRadius] = useState<any[][]>([])

  // Policy Ingestion document state
  const [policyJson, setPolicyJson] = useState(JSON.stringify({
    "policies": [
      {
        "policy_id": "POL-001",
        "name": "Finance Isolation Policy",
        "agent": "Finance Agent",
        "description": "Restrict Finance Agent to verified financial reporting."
      },
      {
        "policy_id": "POL-002",
        "name": "HR Database Guardrails",
        "agent": "HR Agent",
        "description": "Prevent HR Agent from exporting private records."
      }
    ]
  }, null, 2))

  // Vis.js Graph states
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [rawNodes, setRawNodes] = useState<any[]>([])
  const [rawEdges, setRawEdges] = useState<any[]>([])

  useEffect(() => {
    checkHealth()
    // Data is intentionally NOT pre-loaded on mount.
    // The user must click "Discover Agents" or "Scan Network" to populate the dashboard.
  }, [])

  useEffect(() => {
    if (currentView === 'graph' && containerRef.current && rawNodes.length > 0) {
      const timer = setTimeout(() => {
        initVisNetwork()
      }, 100);
      return () => clearTimeout(timer)
    }
  }, [currentView, rawNodes, rawEdges])

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/database/ping`)
      if (res.ok) {
        setDbHealthy(true)
      } else {
        setDbHealthy(false)
      }
    } catch {
      setDbHealthy(false)
    }
  }

  const fetchOpaPolicy = async () => {
    try {
      const res = await fetch(`${API_BASE}/governance/opa-policy`)
      if (res.ok) {
        const d = await res.json()
        setOpaPolicy(d.opa_policy || '')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchRiskCards = async () => {
    try {
      const res = await fetch(`${API_BASE}/governance/risk-cards`)
      if (res.ok) {
        const d = await res.json()
        setRiskCards(d || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchQueries = async () => {
    try {
      const orphansRes = await fetch(`${API_BASE}/governance/queries/orphan_agents`)
      if (orphansRes.ok) {
        const d = await orphansRes.json()
        setOrphanAgents(d.data || [])
      }

      const dsRes = await fetch(`${API_BASE}/governance/queries/datasource_access`)
      if (dsRes.ok) {
        const d = await dsRes.json()
        setDatasourceAccess(d.data || [])
      }

      loadGraphData()
      runBlastRadiusQuery()
      fetchOpaPolicy()
      fetchRiskCards()
    } catch (e) {
      console.error(e)
    }
  }

  const loadGraphData = async () => {
    try {
      const res = await fetch(`${API_BASE}/governance/graph-data`)
      if (res.ok) {
        const data = await res.json()
        // Filter out model nodes just in case they exist in database
        const filteredNodes = (data.nodes || []).filter((n: any) => n.group !== 'Model')
        const filteredEdges = (data.edges || []).filter((e: any) => {
          // Remove connections leading to/from model groups
          const srcNode = filteredNodes.find((n: any) => n.id === e.from)
          const dstNode = filteredNodes.find((n: any) => n.id === e.to)
          return srcNode && dstNode
        })
        setRawNodes(filteredNodes)
        setRawEdges(filteredEdges)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const initVisNetwork = () => {
    if (!containerRef.current || typeof vis === 'undefined') return;

    // Separate servers by risk levels
    const highRiskServers = new Set<string>();
    const lowRiskServers = new Set<string>();
    const unscannedServers = new Set<string>();

    rawNodes.forEach((n: any) => {
      if (n.group === 'MCPServer') {
        const riskLevel = n.properties.risk_level;
        if (riskLevel === 'HIGH') {
          highRiskServers.add(n.id);
        } else if (riskLevel === 'LOW' || riskLevel === 'MEDIUM') {
          lowRiskServers.add(n.id);
        } else {
          unscannedServers.add(n.id);
        }
      }
    });

    const nodes = rawNodes.map((n: any) => {
      let color = '#57606f' // default neutral gray
      let fontColor = '#dcdde1'
      let shape = 'dot'
      let size = 20

      if (n.group === 'Agent') {
        if (n.label === 'Brain Agent') {
          color = '#e67e22' // Vivid orange/gold orchestrator
          shape = 'box'
          size = 32
        } else {
          color = '#2980b9' // Bright professional blue for sub-agents
          shape = 'box'
          size = 26
        }
      } else if (n.group === 'Proxy') {
        color = '#00d2d3' // GodsEye intercepting proxy cyan
        shape = 'diamond'
        size = 22
      } else if (n.group === 'MCPServer') {
        if (highRiskServers.has(n.id)) {
          color = '#ff4757' // red
          fontColor = '#ff4757'
        } else if (lowRiskServers.has(n.id)) {
          color = '#2ed573' // green
          fontColor = '#2ed573'
        } else {
          color = '#8c9099' // neutral unscanned gray
          fontColor = '#8c9099'
        }
        shape = 'dot'
        size = 28
      } else if (n.group === 'Tool') {
        color = '#57606f'
        shape = 'dot'
        size = 15
      } else if (n.group === 'DataSource') {
        color = '#ff9f43' // orange accent
        shape = 'dot'
        size = 20
      } else if (n.group === 'Policy') {
        color = '#9b59b6'
        shape = 'box'
        size = 20
      } else if (n.group === 'User') {
        color = '#e67e22'
        shape = 'box'
        size = 20
      }

      let borderWidth = 2
      let borderColor = '#2f3542'
      
      if (n.group === 'Agent') {
        if (n.label === 'Brain Agent') {
          borderWidth = 3
          borderColor = '#ff9f43'
        } else {
          borderWidth = 2
          borderColor = '#3498db'
        }
      } else if (n.group === 'Proxy') {
        borderWidth = 2
        borderColor = '#0abde3'
      }
      
      if (n.is_last_path) {
        borderColor = '#ff9f43' // orange path glow
        borderWidth = 4
      }

      return {
        id: n.id,
        label: n.label,
        shape: shape,
        size: size,
        color: {
          background: color,
          border: borderColor,
          highlight: {
            background: color,
            border: '#ffffff'
          }
        },
        font: {
          color: n.group === 'Agent' ? '#ffffff' : fontColor,
          size: n.label === 'Brain Agent' ? 14 : 12,
          face: 'Outfit',
          bold: n.group === 'Agent' ? true : false
        },
        borderWidth: borderWidth,
        properties: n.properties,
        groupType: n.group
      }
    })

    const edges = rawEdges.map((e: any, idx: number) => {
      let color = '#57606f'
      let width = 2
      let dashes = false

      const connectsToHighRisk = highRiskServers.has(e.from) || highRiskServers.has(e.to)
      const connectsToLowRisk = lowRiskServers.has(e.from) || lowRiskServers.has(e.to)

      if (connectsToHighRisk) {
        color = '#ff4757'
        width = 3
      } else if (connectsToLowRisk) {
        color = '#2ed573'
        width = 3
      }

      if (e.is_last_path) {
        color = '#ff9f43' // Glowing orange for active run
        width = 4
      }

      if (e.label === 'CALLS' && e.properties.status === 'BLOCKED') {
        dashes = true
      }

      return {
        id: `edge-${idx}`,
        from: e.from,
        to: e.to,
        label: e.label,
        font: {
          color: '#8c9099',
          size: 9,
          align: 'middle'
        },
        arrows: 'to',
        color: {
          color: color,
          highlight: '#ffffff'
        },
        width: width,
        dashes: dashes
      }
    })

    const options = {
      nodes: {
        scaling: { min: 10, max: 30 }
      },
      edges: {
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'none',
          roundness: 0.5
        }
      },
      physics: {
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -10000,
          centralGravity: 0.15,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.9,
          avoidOverlap: 1
        },
        maxVelocity: 50,
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    }

    const network = new vis.Network(containerRef.current, { nodes, edges }, options)
    networkRef.current = network

    network.on('selectNode', (params: any) => {
      const nodeId = params.nodes[0]
      const clickedNode = nodes.find(n => n.id === nodeId)
      if (clickedNode) {
        setSelectedNode({
          type: clickedNode.groupType,
          name: clickedNode.label,
          properties: clickedNode.properties
        })
      }
    })

    network.on('deselectNode', () => {
      setSelectedNode(null)
    })
  }

  const runBlastRadiusQuery = async () => {
    if (!blastTool) return
    try {
      const res = await fetch(`${API_BASE}/governance/queries/blast_radius?tool_name=${blastTool}`)
      if (res.ok) {
        const d = await res.json()
        setBlastRadius(d.data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const triggerBootstrap = async () => {
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    // Immediately wipe all dashboard state for a clean slate
    setRiskCards([])
    setOpaPolicy('')
    setOrphanAgents([])
    setDatasourceAccess([])
    setBlastRadius([])
    setRawNodes([])
    setRawEdges([])
    setSelectedNode(null)
    try {
      const res = await fetch(`${API_BASE}/discovery/bootstrap`, { method: 'POST' })
      if (res.ok) {
        setSuccessMsg('Graph database cleared. Click "Scan Network" to run a fresh compliance scan.')
      } else {
        setErrorMsg('Discovery reset failed.')
      }
    } catch {
      setErrorMsg('Error connecting to backend.')
    } finally {
      setLoading(false)
    }
  }

  const triggerComplianceScan = async () => {
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/discovery/scan-all`, { method: 'POST' })
      if (res.ok) {
        setSuccessMsg('Compliance Network Scan Completed. Risk scores successfully updated!')
        fetchQueries()
      } else {
        setErrorMsg('Network scan failed.')
      }
    } catch {
      setErrorMsg('Error connecting to scanner.')
    } finally {
      setLoading(false)
    }
  }

  const postPolicy = async () => {
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/governance/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: policyJson
      })
      if (res.ok) {
        setSuccessMsg('Policies published and linked to active agents!')
        fetchQueries()
      } else {
        setErrorMsg('Policy ingestion failed.')
      }
    } catch {
      setErrorMsg('Error sending policy.')
    } finally {
      setLoading(false)
    }
  }

  const executeAgentTask = async () => {
    setExecuting(true)
    setExecutionOutput('Executing task prompt through gateway...\n')
    try {
      const res = await fetch(`${API_BASE}/governance/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: selectedAgent,
          prompt: promptInput
        })
      })
      if (res.ok) {
        const data = await res.json()
        setExecutionOutput(data.stdout || data.stderr || 'No response logs.')
        fetchQueries()
      } else {
        setExecutionOutput('Execution failed. Interception active.')
      }
    } catch {
      setExecutionOutput('Failed to execute command.')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ff9f43 0%, #e67e22 100%)',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 0 15px rgba(245, 124, 0, 0.3)'
          }}>
            <Shield size={24} color="#121314" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              GodsEye
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI Agent Gatekeeper & Threat Scanner</p>
          </div>
        </div>

        {/* View Selection */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setCurrentView('console')}
            style={{
              background: currentView === 'console' ? 'rgba(245, 124, 0, 0.12)' : 'none',
              border: currentView === 'console' ? '1px solid var(--accent-orange)' : '1px solid transparent',
              color: currentView === 'console' ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            Agent Console
          </button>
          
          <button 
            onClick={() => setCurrentView('graph')}
            style={{
              background: currentView === 'graph' ? 'rgba(245, 124, 0, 0.12)' : 'none',
              border: currentView === 'graph' ? '1px solid var(--accent-orange)' : '1px solid transparent',
              color: currentView === 'graph' ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            Governance Graph
          </button>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={triggerBootstrap} 
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} />
            Discover Agents
          </button>

          <button 
            onClick={triggerComplianceScan} 
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ff9f43 0%, #e67e22 100%)',
              color: '#121314',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Activity size={12} />
            Scan Network
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Banner Alert Messages */}
        {successMsg && (
          <div style={{ padding: '12px 20px', backgroundColor: 'rgba(46, 213, 115, 0.08)', border: '1px solid rgba(46, 213, 115, 0.15)', color: 'var(--accent-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div style={{ padding: '12px 20px', backgroundColor: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.15)', color: 'var(--accent-red)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
          </div>
        )}

        {/* ============================== CONSOLE VIEW ============================== */}
        {currentView === 'console' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Top Level: Agent execution panel */}
            <section className="gradient-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={20} />
                  Agent Execution & Proxy Interceptor
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Active Gateway: <code>Stdio Interceptor Wrapping</code>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Issue prompts to the **Brain Agent**. It evaluates context, orchestrates sub-agents, and communicates with MCP servers. The GodsEye proxy wrapper intercepts runtime commands, dynamically scanning risks before allowing actions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Fleet Agents:</span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(230, 126, 34, 0.15)',
                    color: 'var(--accent-orange)',
                    border: '1px solid rgba(230, 126, 34, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Cpu size={12} /> Brain Agent (Orchestrator)
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    color: '#3498db',
                    border: '1px solid rgba(52, 152, 219, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Finance Agent
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    color: '#3498db',
                    border: '1px solid rgba(52, 152, 219, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    HR Agent
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    color: '#3498db',
                    border: '1px solid rgba(52, 152, 219, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    DevOps Agent
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <input 
                  type="text" 
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  placeholder="Ask a task (e.g. read HR folder, print deploy status, fetch financials)..."
                  style={{
                    flex: 1,
                    backgroundColor: '#1c1e1f',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />

                <button 
                  onClick={executeAgentTask}
                  disabled={executing}
                  style={{
                    background: 'linear-gradient(135deg, #ff9f43 0%, #e67e22 100%)',
                    color: '#121314',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={14} color="#121314" />
                  {executing ? 'Intercepting...' : 'Run Task'}
                </button>
              </div>

              {executionOutput && (
                <pre style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#121314',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#e0e2e5',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '220px'
                }}>
                  <code>{executionOutput}</code>
                </pre>
              )}
            </section>

            {/* Sub-navigation tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
              <button 
                onClick={() => setActiveSubTab('compliance')} 
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 16px',
                  color: activeSubTab === 'compliance' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  borderBottom: activeSubTab === 'compliance' ? '2px solid var(--accent-orange)' : 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Ecosystem Auditing
              </button>
              <button 
                onClick={() => setActiveSubTab('policy')} 
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 16px',
                  color: activeSubTab === 'policy' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  borderBottom: activeSubTab === 'policy' ? '2px solid var(--accent-orange)' : 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Ingest Policy Rules
              </button>
              <button 
                onClick={() => {
                  setActiveSubTab('opa');
                  fetchOpaPolicy();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 16px',
                  color: activeSubTab === 'opa' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  borderBottom: activeSubTab === 'opa' ? '2px solid var(--accent-orange)' : 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                OPA Policy Generator
              </button>
            </div>

            {/* Compliance view */}
            {activeSubTab === 'compliance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Risk Assessment Fleet Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Security Risk Assessment Cards</h5>
                  
                  {riskCards.length === 0 ? (
                    <div className="gradient-border" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No risk cards generated yet. Click **Scan Network** to audit servers, classify risks, and retrieve active findings.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {riskCards.map((card, i) => (
                        <div key={i} className="gradient-border" style={{
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          borderLeft: card.level === 'HIGH' ? '4px solid var(--accent-red)' : '4px solid var(--accent-green)',
                          background: 'rgba(255, 255, 255, 0.01)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {card.server}
                              </h4>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Owner: {card.owner}
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: card.level === 'HIGH' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(46, 213, 115, 0.15)',
                              color: card.level === 'HIGH' ? 'var(--accent-red)' : 'var(--accent-green)',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              border: card.level === 'HIGH' ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(46, 213, 115, 0.3)'
                            }}>
                              {card.score}
                            </div>
                          </div>
                          
                          <div>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              Threat Analysis (Why it is risky):
                            </span>
                            {card.findings.length === 0 ? (
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                No vulnerabilities found. Server is compliant.
                              </p>
                            ) : (
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {card.findings.map((f, idx) => (
                                  <li key={idx}>{f}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              Remediation Steps:
                            </span>
                            {card.recommendations.length === 0 ? (
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                None. Posture is secure.
                              </p>
                            ) : (
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {card.recommendations.map((rec, idx) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  
                  {/* Column 1: Audits */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="gradient-border" style={{ padding: '24px' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--accent-orange)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={18} />
                        Orphan Agents Checklist
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                        <strong>Audit Parameter:</strong> An orphan agent is an active AI agent that lacks an associated security policy node in the governance graph. All operational agents must be bound by policy definitions to limit potential operational compromise and unauthorized resource access.
                      </p>
                      {orphanAgents.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All discovered agents are bound by policy definitions.</p>
                      ) : (
                        <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {orphanAgents.map(a => (
                            <li key={a} style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{a} (No policy attachment node!)</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="gradient-border" style={{ padding: '24px' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--accent-orange)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Database size={18} />
                        Discovered DataSource Map
                      </h4>
                      {datasourceAccess.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Empty catalog. Click Scan Network to populate.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                              <th style={{ paddingBottom: '6px' }}>Agent</th>
                              <th style={{ paddingBottom: '6px' }}>DataSource</th>
                              <th style={{ paddingBottom: '6px' }}>Exposed By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {datasourceAccess.map((d, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                                <td style={{ padding: '6px 0' }}>{d.agent}</td>
                                <td style={{ padding: '6px 0', color: 'var(--accent-orange)' }}>{d.datasource}</td>
                                <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>{d.tool}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Blast Radius Traversal */}
                  <div className="gradient-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Network size={18} />
                      Path Blast Radius Calculator
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Enter any **MCP Server Name** (e.g. <code>DevOps MCP</code>) or **Tool Name** (e.g. <code>execute_shell</code>) to audit if its path is compromised.
                    </p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        value={blastTool} 
                        onChange={e => setBlastTool(e.target.value)}
                        placeholder="e.g. DevOps MCP or execute_shell"
                        style={{
                          flex: 1,
                          backgroundColor: '#1c1e1f',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                      <button 
                        onClick={runBlastRadiusQuery}
                        style={{
                          backgroundColor: 'var(--accent-orange)',
                          color: '#121314',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Audit Path
                      </button>
                    </div>

                    {blastRadius.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
                        No active threat paths found for: <strong>{blastTool}</strong>
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600 }}>
                          ⚠️ Compromised Paths Traversed:
                        </div>
                        
                        {blastRadius.map((path: any[], i: number) => (
                          <div key={i} style={{ padding: '12px', backgroundColor: 'rgba(255, 71, 87, 0.02)', border: '1px solid rgba(255, 71, 87, 0.1)', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              Path Length: {path.length} nodes compromised
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                              {path.map((node: any, idx: number) => (
                                <React.Fragment key={idx}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: node.type === 'User' ? 'rgba(230, 126, 34, 0.15)' :
                                                    node.type === 'Agent' ? 'rgba(255, 255, 255, 0.05)' :
                                                    'rgba(255, 71, 87, 0.15)',
                                    color: node.type === 'User' ? 'var(--accent-orange)' :
                                           node.type === 'MCPServer' || node.type === 'Tool' ? 'var(--accent-red)' :
                                           'var(--text-primary)'
                                  }}>
                                    {node.name} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>({node.type})</span>
                                  </span>
                                  {idx < path.length - 1 && <span style={{ color: 'var(--text-secondary)' }}>➔</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* Ingest tab */}
            {activeSubTab === 'policy' && (
              <div className="gradient-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', marginBottom: '4px' }}>JSON Policy Ingestion</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Deploy rules to restrict tool actions for specific agents.
                  </p>
                </div>
                
                <textarea 
                  value={policyJson}
                  onChange={e => setPolicyJson(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    backgroundColor: '#121314',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '16px',
                    color: 'var(--accent-orange)',
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={postPolicy}
                    style={{
                      backgroundColor: 'var(--accent-orange)',
                      color: '#121314',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Ingest Policy Rules
                  </button>
                </div>
              </div>
            )}

            {/* OPA Policy tab */}
            {activeSubTab === 'opa' && (
              <div className="gradient-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', marginBottom: '4px' }}>OPA Rego Policy Generator</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Exported Open Policy Agent (OPA) rules based on active risk postures detected by GodsEye. High-risk servers are dynamically restricted.
                  </p>
                </div>
                
                <pre style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#121314',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--accent-orange)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '400px'
                }}>
                  <code>{opaPolicy || 'No OPA rules generated yet. Scan network to parse risk scores.'}</code>
                </pre>
              </div>
            )}

          </div>
        )}

        {/* ============================== GRAPH VIEW ============================== */}
        {currentView === 'graph' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setCurrentView('console')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-orange)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                <ArrowLeft size={16} /> Back to Agent Console
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
              
              {/* Visualizer network */}
              <div className="gradient-border" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)' }}>Ecosystem Topology Visualizer</h4>
                  <button 
                    onClick={loadGraphData}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} /> Reload
                  </button>
                </div>
                <div 
                  ref={containerRef} 
                  style={{ height: '550px', width: '100%', borderRadius: '12px' }} 
                />
              </div>

              {/* Sidebar Inspector */}
              <div className="gradient-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '550px', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
                  Component Inspector
                </h4>

                {!selectedNode ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '60px 0' }}>
                    Select a node inside the map to audit node configuration details.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Type label</span>
                      <h5 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)' }}>{selectedNode.type}</h5>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Friendly Name</span>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedNode.name}</p>
                    </div>

                    {selectedNode.type === 'MCPServer' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Department Owner</span>
                          <p style={{ fontSize: '0.85rem' }}>{selectedNode.properties.owner || '—'}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Dynamic Risk Rating</span>
                          <p style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 700, 
                            color: selectedNode.properties.risk_level === 'HIGH' ? 'var(--accent-red)' : 
                                   selectedNode.properties.risk_level ? 'var(--accent-green)' : 'var(--text-secondary)' 
                          }}>
                            {selectedNode.properties.risk_level === 'HIGH' ? '85 (HIGH RISK)' : 
                             selectedNode.properties.risk_level ? '20 (LOW RISK)' : 'Unscanned (Pending execution check)'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Requires Auth:</span>
                            <span>{selectedNode.properties.auth_required ? 'YES' : 'NO'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>TLS Secure:</span>
                            <span>{selectedNode.properties.tls_enabled ? 'YES' : 'NO'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Publicly exposed:</span>
                            <span>{selectedNode.properties.public_exposed ? 'YES' : 'NO'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'Tool' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Category</span>
                          <p>{selectedNode.properties.category || '—'}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Default Security Risk</span>
                          <p style={{ color: selectedNode.properties.risk === 'HIGH' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                            {selectedNode.properties.risk || '—'}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Description</span>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{selectedNode.properties.description || '—'}</p>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'Policy' && (
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Rule details</span>
                        <p style={{ color: 'var(--text-secondary)' }}>{selectedNode.properties.description || 'Active isolation policy constraint.'}</p>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        fontSize: '0.75rem',
        marginTop: 'auto'
      }}>
        GodsEye Policy Gatekeeper • Ash-Orange Threat Compliance Platform
      </footer>
    </div>
  )
}
