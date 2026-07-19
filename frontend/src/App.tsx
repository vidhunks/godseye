import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  Activity,
  Database,
  Network,
  AlertTriangle,
  Play,
  Cpu,
  CheckCircle,
  Terminal,
  RefreshCw,
  ArrowLeft,
  History,
  Clock,
  Filter
} from 'lucide-react'

const API_BASE = '/api'

declare const vis: any;

export default function App() {
  const [currentView, setCurrentView] = useState<'console' | 'graph'>('console')
  const [activeSubTab, setActiveSubTab] = useState<'compliance' | 'policy' | 'opa' | 'inventory' | 'logs'>('compliance')
  const [serverInventory, setServerInventory] = useState<any[]>([])
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [, setDbHealthy] = useState<boolean | null>(null)

  // OPA and Risk Assessment Fleet states
  const [opaPolicy, setOpaPolicy] = useState('')
  const [riskCards, setRiskCards] = useState<any[]>([])

  // Console execution states
  const [promptInput, setPromptInput] = useState('Run DevOps deploy and restart logs command')
  const [selectedAgent, _setSelectedAgent] = useState('Brain Agent')
  const [executionOutput, setExecutionOutput] = useState('')
  const [executing, setExecuting] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  // Execution logs state
  const [executionLogs, setExecutionLogs] = useState<any[]>([])
  const [logsFilter, setLogsFilter] = useState<'all' | 'SUCCESS' | 'BLOCKED' | 'FAILED'>('all')
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

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

  const fetchExecutionLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch(`${API_BASE}/governance/execution-logs?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setExecutionLogs(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLogs(false)
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

  const fetchServerInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/governance/server-inventory`)
      if (res.ok) {
        const data = await res.json()
        setServerInventory(data || [])
      }
    } catch (e) {
      console.error('Failed to fetch server inventory:', e)
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
        fetchServerInventory()
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
    setIsBlocked(false)
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
        if (data.status === 'blocked') {
          setIsBlocked(true)
          setExecutionOutput(data.stdout || 'Task blocked by GodsEye Policy Engine.')
        } else {
          setIsBlocked(false)
          setExecutionOutput(data.stdout || data.stderr || 'No response logs.')
          fetchQueries()
        }
      } else {
        setIsBlocked(false)
        setExecutionOutput('Execution failed. Interception active.')
      }
    } catch {
      setIsBlocked(false)
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
        padding: '14px 28px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(13,15,16,0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ff9f43 0%, #e67e22 100%)',
            padding: '8px',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(255,159,67,0.4)'
          }}>
            <Shield size={22} color="#0d0f10" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-orange)', lineHeight: 1.1 }} className="glow-text">
              GodsEye
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div className="pulse-dot" />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>AI Agent Gatekeeper &amp; Threat Scanner</p>
            </div>
          </div>
        </div>

        {/* View Selection */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setCurrentView('console')}
            style={{
              background: currentView === 'console' ? 'rgba(255,159,67,0.15)' : 'none',
              border: currentView === 'console' ? '1px solid rgba(255,159,67,0.3)' : '1px solid transparent',
              color: currentView === 'console' ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '7px 16px', borderRadius: '7px', fontWeight: 600,
              fontSize: '0.82rem', cursor: 'pointer', transition: 'var(--transition-smooth)'
            }}
          >
            Agent Console
          </button>
          <button
            onClick={() => setCurrentView('graph')}
            style={{
              background: currentView === 'graph' ? 'rgba(255,159,67,0.15)' : 'none',
              border: currentView === 'graph' ? '1px solid rgba(255,159,67,0.3)' : '1px solid transparent',
              color: currentView === 'graph' ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '7px 16px', borderRadius: '7px', fontWeight: 600,
              fontSize: '0.82rem', cursor: 'pointer', transition: 'var(--transition-smooth)'
            }}
          >
            Governance Graph
          </button>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { setCurrentView('console'); setActiveSubTab('logs'); fetchExecutionLogs(); }}
            className="btn-ghost"
            title="Execution History"
          >
            <History size={14} />
            Logs
          </button>

          <button onClick={triggerBootstrap} disabled={loading} className="btn-ghost">
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Discover Agents
          </button>

          <button onClick={triggerComplianceScan} disabled={loading} className="btn-primary">
            <Activity size={13} />
            {loading ? 'Scanning…' : 'Scan Network'}
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
                <div style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: isBlocked ? 'rgba(255,71,87,0.07)' : 'rgba(0,0,0,0.5)',
                  border: `1px solid ${isBlocked ? 'rgba(255,71,87,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px',
                  borderLeft: isBlocked ? '3px solid #ff4757' : '3px solid var(--accent-green)',
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}>
                  {isBlocked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4757', fontWeight: 700, fontSize: '0.82rem', marginBottom: '10px' }}>
                      <AlertTriangle size={14} /> POLICY VIOLATION — EXECUTION BLOCKED
                    </div>
                  )}
                  <pre className="terminal-output" style={{ margin: 0 }}>{executionOutput}</pre>
                </div>
              )}
            </section>

            {/* Sub-navigation tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', overflowX: 'auto' }}>
              <button className={`subtab-btn ${activeSubTab === 'compliance' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('compliance')}>
                <Network size={13} style={{ display: 'inline', marginRight: 5 }} />Ecosystem Auditing
              </button>
              <button className={`subtab-btn ${activeSubTab === 'policy' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('policy')}>
                <Database size={13} style={{ display: 'inline', marginRight: 5 }} />Ingest Policy Rules
              </button>
              <button className={`subtab-btn ${activeSubTab === 'opa' ? 'active' : ''}`}
                onClick={() => { setActiveSubTab('opa'); fetchOpaPolicy(); }}>
                <Shield size={13} style={{ display: 'inline', marginRight: 5 }} />OPA Policy Generator
              </button>
              <button className={`subtab-btn ${activeSubTab === 'inventory' ? 'active' : ''}`}
                onClick={() => { setActiveSubTab('inventory'); fetchServerInventory(); }}>
                <Cpu size={13} style={{ display: 'inline', marginRight: 5 }} />Server Inventory
              </button>
              <button className={`subtab-btn ${activeSubTab === 'logs' ? 'active' : ''}`}
                onClick={() => { setActiveSubTab('logs'); fetchExecutionLogs(); }}>
                <History size={13} style={{ display: 'inline', marginRight: 5 }} />Execution Logs
              </button>
            </div>

            {/* ── LOGS PANEL ─────────────────────────────────────────── */}
            {activeSubTab === 'logs' && (
              <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={16} color="var(--accent-orange)" /> Execution History
                    </h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>All tool call events stored in the governance graph.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Filter size={13} color="var(--text-muted)" />
                    {(['all', 'SUCCESS', 'BLOCKED', 'FAILED'] as const).map(f => (
                      <button key={f} onClick={() => setLogsFilter(f)}
                        style={{
                          padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600,
                          cursor: 'pointer', border: '1px solid',
                          background: logsFilter === f ? 'var(--accent-orange-dim)' : 'transparent',
                          borderColor: logsFilter === f ? 'var(--accent-orange)' : 'var(--border-color)',
                          color: logsFilter === f ? 'var(--accent-orange)' : 'var(--text-secondary)',
                          transition: 'var(--transition-smooth)'
                        }}>{f === 'all' ? 'All' : f}</button>
                    ))}
                    <button className="btn-ghost" onClick={fetchExecutionLogs} disabled={loadingLogs}
                      style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                      <RefreshCw size={12} style={{ animation: loadingLogs ? 'spin 1s linear infinite' : 'none' }} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="gradient-border" style={{ overflow: 'hidden', padding: 0 }}>
                  {loadingLogs ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><br />Loading execution logs…
                    </div>
                  ) : executionLogs.filter(l => logsFilter === 'all' || l.status === logsFilter).length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <Clock size={28} style={{ marginBottom: 10, opacity: 0.4 }} /><br />
                      No execution logs found. Run an agent task to start recording history.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                      <table className="log-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Agent</th>
                            <th>MCP Server</th>
                            <th>Tool</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {executionLogs
                            .filter(l => logsFilter === 'all' || l.status === logsFilter)
                            .map((log, i) => (
                              <tr key={i} onClick={() => setSelectedLog(log)} style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }} title="Click to view visual execution path">
                                <td className="ts-cell">
                                  {log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : '—'}
                                </td>
                                <td style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{log.agent || '—'}</td>
                                <td>{log.mcp_server || '—'}</td>
                                <td style={{ color: 'var(--accent-blue)' }}>{log.tool || '—'}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`badge badge-${
                                      log.status === 'SUCCESS' ? 'success' :
                                      log.status === 'BLOCKED' ? 'blocked' : 'failed'
                                    }`}>
                                      {log.status === 'SUCCESS' ? '✓' : '⛔'} {log.status}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>inspect ➔</span>
                                  </div>
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Server Inventory view */}
            {activeSubTab === 'inventory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>MCP Server Inventory</h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Full metadata and tool catalog for every discovered server. Populated after network scan.</p>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                    {serverInventory.length} server{serverInventory.length !== 1 ? 's' : ''} discovered
                  </span>
                </div>

                {serverInventory.length === 0 ? (
                  <div className="gradient-border" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No servers discovered yet. Click <strong style={{ color: 'var(--accent-orange)' }}>Scan Network</strong> to populate the inventory.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {serverInventory.map((srv, i) => {
                      const isExpanded = expandedServer === srv.server_name
                      const riskColor = srv.risk_level === 'HIGH' ? '#ff4757' : srv.risk_level === 'MEDIUM' ? '#ffa502' : srv.risk_level === 'LOW' ? '#2ed573' : '#57606f'
                      return (
                        <div key={i} className="gradient-border" style={{
                          borderLeft: `4px solid ${riskColor}`,
                          background: 'rgba(255,255,255,0.01)',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          {/* Server Header Row */}
                          <div
                            onClick={() => setExpandedServer(isExpanded ? null : srv.server_name)}
                            style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: riskColor, boxShadow: `0 0 8px ${riskColor}` }} />
                              <div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{srv.server_name}</span>
                                <span style={{ marginLeft: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>v{srv.version} · {srv.department} · {srv.environment}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
                                {srv.risk_level} {srv.risk_score !== '—' ? `· ${srv.risk_score}/100` : ''}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              {/* Metadata Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', paddingTop: '4px' }}>
                                {[
                                  { label: 'Owner', value: srv.owner },
                                  { label: 'Transport', value: srv.transport },
                                  { label: 'Auth Type', value: srv.auth_type },
                                  { label: 'Auth Required', value: srv.auth_required ? '✅ Yes' : '❌ No' },
                                  { label: 'TLS Enabled', value: srv.tls_enabled ? '✅ Yes' : '❌ No' },
                                  { label: 'Audit Logging', value: srv.audit_enabled ? '✅ Yes' : '❌ No' },
                                  { label: 'Publicly Exposed', value: srv.public_exposed ? '⚠️ Yes' : '✅ No' },
                                ].map((item, j) => (
                                  <div key={j} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Tools Table */}
                              <div>
                                <h6 style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  🔧 Exposed Tools ({srv.tools.length})
                                </h6>
                                {srv.tools.length === 0 ? (
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No tools exposed by this server.</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {srv.tools.map((tool: any, k: number) => {
                                      const toolRiskColor = tool.risk === 'HIGH' ? '#ff4757' : tool.risk === 'MEDIUM' ? '#ffa502' : '#2ed573'
                                      return (
                                        <div key={k} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr auto auto auto',
                                          alignItems: 'center',
                                          gap: '12px',
                                          padding: '10px 14px',
                                          background: 'rgba(255,255,255,0.02)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '6px'
                                        }}>
                                          <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tool.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{tool.description || '—'}</div>
                                            {tool.datasource && <div style={{ fontSize: '0.7rem', color: '#ff9f43', marginTop: '3px' }}>📦 {tool.datasource}</div>}
                                          </div>
                                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                            {tool.category || '—'}
                                          </span>
                                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                            {tool.permission || '—'}
                                          </span>
                                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: `${toolRiskColor}22`, color: toolRiskColor, border: `1px solid ${toolRiskColor}44`, whiteSpace: 'nowrap', fontWeight: 700 }}>
                                            {tool.risk || '—'}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Compliance view */}
            {activeSubTab === 'compliance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Risk Assessment Fleet Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Security Risk Assessment Cards</h5>
                  
                  {riskCards.length === 0 ? (
                    <div className="gradient-border" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No risk cards generated yet. Click <strong style={{ color: 'var(--accent-orange)' }}>Scan Network</strong> to audit servers, classify risks, and retrieve active findings.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                      {riskCards.map((card, i) => {
                        const isHigh = card.level === 'HIGH'
                        const isMed  = card.level === 'MEDIUM'
                        const barClass = isHigh ? 'risk-bar-high' : isMed ? 'risk-bar-medium' : 'risk-bar-low'
                        const score = typeof card.score === 'number' ? card.score : parseInt(card.score) || 0
                        const accentColor = isHigh ? 'var(--accent-red)' : isMed ? 'var(--accent-orange)' : 'var(--accent-green)'
                        return (
                          <div key={i} className="gradient-border" style={{
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            borderLeft: `3px solid ${accentColor}`,
                          }}>
                            {/* Card header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                  {card.server}
                                </h4>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                  Owner: {card.owner}
                                </span>
                              </div>
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '48px', height: '48px', borderRadius: '10px',
                                background: `${accentColor}18`,
                                border: `1px solid ${accentColor}44`,
                                flexDirection: 'column', gap: '1px'
                              }}>
                                <span style={{ fontWeight: 800, fontSize: '1rem', color: accentColor, lineHeight: 1 }}>{score}</span>
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>/100</span>
                              </div>
                            </div>

                            {/* Animated risk bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</span>
                                <span className={`badge badge-${card.level.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '2px 7px' }}>{card.level}</span>
                              </div>
                              <div className="risk-bar-track">
                                <div className={`risk-bar-fill ${barClass}`} style={{ width: `${Math.min(score, 100)}%` }} />
                              </div>
                            </div>

                            <div>
                              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                                Threat Findings:
                              </span>
                              {card.findings.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>No vulnerabilities found. Server is compliant.</p>
                              ) : (
                                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {card.findings.map((f: string, idx: number) => (
                                    <li key={idx}>{f}</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div>
                              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                                Remediation:
                              </span>
                              {card.recommendations.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>None. Posture is secure.</p>
                              ) : (
                                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.74rem', color: 'var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {card.recommendations.map((rec: string, idx: number) => (
                                    <li key={idx}>{rec}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )
                      })}
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

      {/* ── AUDIT TRAJECTORY PATH VISUALIZER MODAL ────────────────── */}
      {selectedLog && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedLog(null)}>
          <div className="gradient-border node-cascade" style={{
            background: 'var(--bg-secondary)',
            width: '100%',
            maxWidth: '920px',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            border: '1px solid rgba(255, 159, 67, 0.2)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} /> Execution Trajectory Audit
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Transaction Log ID: <code>{selectedLog.timestamp ? selectedLog.timestamp.replace(/[^0-9]/g, '').substring(4, 12) : '12345678'}</code> · Recorded {selectedLog.timestamp ? selectedLog.timestamp.replace('T', ' ').substring(0, 19) : '—'}
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>Close [X]</button>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Context</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                  {selectedLog.user}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assumed Role</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '3px' }}>
                  {selectedLog.role}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge badge-${selectedLog.status === 'SUCCESS' ? 'success' : selectedLog.status === 'BLOCKED' ? 'blocked' : 'failed'}`}>
                    {selectedLog.status === 'SUCCESS' ? '✓ APPROVED' : selectedLog.status === 'BLOCKED' ? '⛔ BLOCKED' : '⚠️ FAILED'}
                  </span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Server</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                  {selectedLog.mcp_server}
                </div>
              </div>
            </div>

            {/* Trajectory Graph Display */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '36px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* User Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.05s' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(230, 126, 34, 0.15)', border: '2px solid #e67e22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e67e22', boxShadow: '0 0 15px rgba(230, 126, 34, 0.3)' }}>
                  <Cpu size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>User: {selectedLog.user}</span>
              </div>

              {/* Line 1 */}
              <svg width="60" height="12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="60" y2="6" strokeWidth="3" className={`connector-line-${selectedLog.status.toLowerCase()}`} />
              </svg>

              {/* Orchestrator Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.2s' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(255, 159, 67, 0.15)', border: '2px solid var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)', boxShadow: '0 0 15px rgba(255, 159, 67, 0.3)' }}>
                  <Shield size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>Brain Agent</span>
              </div>

              {/* Line 2 */}
              <svg width="60" height="12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="60" y2="6" strokeWidth="3" className={`connector-line-${selectedLog.status.toLowerCase()}`} />
              </svg>

              {/* Sub-Agent Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.35s' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: selectedLog.status === 'FAILED' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(84, 160, 255, 0.15)',
                  border: `2px solid ${selectedLog.status === 'FAILED' ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedLog.status === 'FAILED' ? 'var(--accent-red)' : 'var(--accent-blue)',
                  boxShadow: `0 0 15px ${selectedLog.status === 'FAILED' ? 'rgba(255, 71, 87, 0.3)' : 'rgba(84, 160, 255, 0.3)'}`
                }}>
                  <Cpu size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLog.agent}</span>
              </div>

              {/* Line 3 */}
              <svg width="60" height="12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="60" y2="6" strokeWidth="3" className={`connector-line-${selectedLog.status.toLowerCase()}`} />
              </svg>

              {/* GodsEye Proxy Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.5s' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: selectedLog.status === 'BLOCKED' ? 'rgba(255, 71, 87, 0.2)' : 'rgba(0, 210, 211, 0.15)',
                  border: `2px solid ${selectedLog.status === 'BLOCKED' ? 'var(--accent-red)' : '#00d2d3'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedLog.status === 'BLOCKED' ? 'var(--accent-red)' : '#00d2d3',
                  boxShadow: `0 0 15px ${selectedLog.status === 'BLOCKED' ? 'rgba(255, 71, 87, 0.4)' : 'rgba(0, 210, 211, 0.3)'}`
                }} className={selectedLog.status === 'BLOCKED' ? 'radar-pulse' : ''}>
                  <Network size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>GodsEye Proxy</span>
              </div>

              {/* Line 4 */}
              <svg width="60" height="12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="60" y2="6" strokeWidth="3" className={`connector-line-${selectedLog.status.toLowerCase()}`} />
              </svg>

              {/* MCP Server Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.65s' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: selectedLog.status === 'BLOCKED' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(46, 213, 115, 0.15)',
                  border: `2px solid ${selectedLog.status === 'BLOCKED' ? '#ff4757' : 'var(--accent-green)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedLog.status === 'BLOCKED' ? '#ff4757' : 'var(--accent-green)',
                  boxShadow: `0 0 15px ${selectedLog.status === 'BLOCKED' ? 'rgba(255, 71, 87, 0.2)' : 'rgba(46, 213, 115, 0.3)'}`,
                  opacity: selectedLog.status === 'BLOCKED' ? 0.6 : 1
                }}>
                  <Database size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedLog.status === 'BLOCKED' ? '#ff4757' : 'var(--text-primary)' }}>
                  {selectedLog.mcp_server}
                </span>
              </div>

              {/* Line 5 */}
              <svg width="60" height="12" style={{ flexShrink: 0 }}>
                <line x1="0" y1="6" x2="60" y2="6" strokeWidth="3" className={`connector-line-${selectedLog.status.toLowerCase()}`} style={{ opacity: selectedLog.status === 'BLOCKED' ? 0.2 : 1 }} />
              </svg>

              {/* Tool Node */}
              <div className="node-cascade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, animationDelay: '0.8s' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: selectedLog.status === 'SUCCESS' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `2px solid ${selectedLog.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedLog.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  boxShadow: selectedLog.status === 'SUCCESS' ? '0 0 15px rgba(46, 213, 115, 0.3)' : 'none',
                  opacity: selectedLog.status === 'SUCCESS' ? 1 : 0.4
                }}>
                  <Terminal size={20} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedLog.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                  {selectedLog.status === 'BLOCKED' ? '🚫 BLOCKED' : selectedLog.tool}
                </span>
              </div>
            </div>

            {/* Explanation / Audit Summary */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              padding: '16px',
              borderLeft: `4px solid ${
                selectedLog.status === 'SUCCESS' ? 'var(--accent-green)' :
                selectedLog.status === 'BLOCKED' ? 'var(--accent-red)' : 'var(--accent-red)'
              }`,
              fontSize: '0.85rem',
              lineHeight: '1.5'
            }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Security Audit Verdict:</strong>
              {selectedLog.status === 'SUCCESS' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  Task execution was approved. The request from user **{selectedLog.user}** successfully bypassed all active isolation criteria and mapped to **{selectedLog.mcp_server}** to invoke tool `"{selectedLog.tool}"`. Posture is compliant.
                </span>
              )}
              {selectedLog.status === 'BLOCKED' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  The task was **blocked pre-emptively** by the GodsEye Policy Interceptor. The routed agent (**{selectedLog.agent}**) attempted to target high-risk resources on server **{selectedLog.mcp_server}**. Execution subprocess was terminated safely before any external commands could run.
                </span>
              )}
              {selectedLog.status === 'FAILED' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  The task was initiated and allowed by the gateway, but the orchestrator run returned a non-zero exit code failure. Check target server console logs for runtime exceptions or authentication key issues.
                </span>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
