FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them first (for better cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire repo so that sample_agents and mcp_servers are accessible
# at relative path ../sample_agents from the backend working directory
COPY . /repo

# Set workdir to backend (so ../sample_agents resolves to /repo/sample_agents)
WORKDIR /repo/backend

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
