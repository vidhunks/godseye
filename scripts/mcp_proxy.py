import argparse
import json
import os
import sys
import threading
import time
import subprocess
import requests

# Default endpoints
EVENTS_URL = "http://127.0.0.1:8000/events/"
CHECK_RISK_URL = "http://127.0.0.1:8000/governance/check-risk"

def publish_proxy_event(brain_agent, agent, server, tool, user, role, status="SUCCESS"):
    """
    Asynchronously publish an execution event to the backend API.
    """
    payload = {
        "event": "mcp_execution",
        "execution_id": str(time.time()),
        "brain_agent": brain_agent,
        "agent": agent,
        "mcp_server": server,
        "tool": tool,
        "user": user,
        "role": role,
        "status": status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    def post_request():
        try:
            requests.post(EVENTS_URL, json=payload, timeout=5)
        except Exception:
            pass  # Fail silently to not impact stdout/stdio stream operations

    threading.Thread(target=post_request, daemon=True).start()

def check_server_risk(server_name):
    """
    Synchronously query backend to check if the server is high risk.
    """
    try:
        res = requests.get(f"{CHECK_RISK_URL}?server={server_name}", timeout=2)
        if res.ok:
            data = res.json()
            return data.get("level") == "HIGH"
    except Exception:
        pass
    return False

def main():
    parser = argparse.ArgumentParser(description="GodsEye Active Policy Interception Gateway stdio proxy.")
    parser.add_argument("--server", required=True, help="Path to the target Python MCP server.")
    parser.add_argument("--agent", required=True, help="Agent name (e.g. Finance Agent).")
    parser.add_argument("--server-name", required=True, help="Server name (e.g. Finance MCP).")
    parser.add_argument("--user", required=True, help="Mock user name.")
    parser.add_argument("--role", required=True, help="Mock role name.")
    
    args, unknown = parser.parse_known_args()

    server_script = os.path.abspath(args.server)
    
    # Check if target server is blocked BEFORE spawning process
    is_blocked = check_server_risk(args.server_name)
    
    # Run the server script with the active Python virtual environment
    cmd = [sys.executable, server_script] + unknown
    
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    # Thread to pipe stderr from subprocess to local stderr
    def pipe_stderr():
        for line in proc.stderr:
            sys.stderr.write(line)
            sys.stderr.flush()
            
    threading.Thread(target=pipe_stderr, daemon=True).start()

    # Thread to pipe stdin (Agent output) to subprocess stdin
    def pipe_stdin():
        try:
            for line in sys.stdin:
                intercepted = False
                # Active inspection: scan for tool calls
                try:
                    payload = json.loads(line)
                    if isinstance(payload, dict) and payload.get("method") == "tools/call":
                        params = payload.get("params", {})
                        tool_name = params.get("name")
                        req_id = payload.get("id")
                        
                        if is_blocked:
                            # 1. Block call and log status as BLOCKED
                            publish_proxy_event(
                                brain_agent="Brain Agent",
                                agent=args.agent,
                                server=args.server_name,
                                tool=tool_name,
                                user=args.user,
                                role=args.role,
                                status="BLOCKED"
                            )
                            
                            # 2. Return JSON-RPC error directly back to the agent client
                            err_response = {
                                "jsonrpc": "2.0",
                                "id": req_id,
                                "error": {
                                    "code": -32602,
                                    "message": f"Access Denied by GodsEye Policy: Server '{args.server_name}' has HIGH risk score."
                                }
                            }
                            sys.stdout.write(json.dumps(err_response) + "\n")
                            sys.stdout.flush()
                            intercepted = True
                        else:
                            # Log success event in the background
                            publish_proxy_event(
                                brain_agent="Brain Agent",
                                agent=args.agent,
                                server=args.server_name,
                                tool=tool_name,
                                user=args.user,
                                role=args.role,
                                status="SUCCESS"
                            )
                except Exception:
                    pass
                
                # Only pass down to server if not blocked/intercepted
                if not intercepted and proc.stdin:
                    proc.stdin.write(line)
                    proc.stdin.flush()
        except (IOError, ValueError):
            pass
        finally:
            proc.terminate()

    threading.Thread(target=pipe_stdin, daemon=True).start()

    # Main thread: pipe subprocess stdout (Server output) back to sys.stdout
    try:
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
    except (IOError, ValueError):
        pass
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
