import os
import requests
from dotenv import load_dotenv

# Try to load environment variables from backend/.env if running as subprocess
try:
    load_dotenv("../../backend/.env")
    load_dotenv("../backend/.env")
    load_dotenv("backend/.env")
    load_dotenv(".env")
except Exception:
    pass

class AgentRouter:

    def select_agent(self, user_request: str):
        prompt = f"User Request: {user_request}"
        system_prompt = (
            "You are an intelligent agent router for the GodsEye platform.\n"
            "Your job is to read a user request and select the most appropriate agent from the following list:\n"
            "- \"Finance Agent\": Handles financial reporting, budget, invoice, and money tasks.\n"
            "- \"HR Agent\": Handles employee record, salary, leave, and human resources tasks.\n"
            "- \"DevOps Agent\": Handles shell commands, docker, servers, restarts, deployments, and logs.\n\n"
            "Respond with ONLY the name of the selected agent (e.g., \"Finance Agent\", \"HR Agent\", \"DevOps Agent\") or \"None\" if no agent fits. Do not write any other text."
        )

        llm_result = ""
        groq_key = os.getenv("GROK_API_KEY") or os.getenv("GROQ_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if groq_key or openai_key:
            print("[LLM Router] Calling LLM for agent routing...")
            try:
                if groq_key:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.0
                    }
                    resp = requests.post(url, json=payload, headers=headers, timeout=8)
                    if resp.status_code == 200:
                        llm_result = resp.json()["choices"][0]["message"]["content"].strip()
                    else:
                        err_msg = resp.json().get('error', {}).get('message', resp.text)
                        print(f"[LLM Router] Groq API error {resp.status_code}: {err_msg}")
                elif openai_key:
                    url = "https://api.openai.com/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.0
                    }
                    resp = requests.post(url, json=payload, headers=headers, timeout=8)
                    if resp.status_code == 200:
                        llm_result = resp.json()["choices"][0]["message"]["content"].strip()
                    else:
                        err_msg = resp.json().get('error', {}).get('message', resp.text)
                        print(f"[LLM Router] OpenAI API error {resp.status_code}: {err_msg}")
            except Exception as e:
                print(f"[LLM Router] API call failed: {e}")

        valid_agents = ["Finance Agent", "HR Agent", "DevOps Agent"]
        clean_result = llm_result.replace('"', '').replace("'", "").strip()
        if clean_result in valid_agents:
            print(f"[LLM Router] LLM successfully routed task to: {clean_result}")
            return clean_result

        if groq_key or openai_key:
            print("[LLM Router] LLM routing failed or returned invalid agent. Falling back to rule-based...")
        else:
            print("[LLM Router (Rule-based Fallback)] No API key found in env. Using rule-based keyword matching...")

        request = user_request.lower()

        if any(word in request for word in ["finance", "budget", "invoice", "report"]):
            return "Finance Agent"

        if any(word in request for word in ["employee", "leave", "salary", "hr"]):
            return "HR Agent"

        if any(word in request for word in ["server", "docker", "deployment", "cpu", "shell", "restart", "deploy", "log"]):
            return "DevOps Agent"

        return None