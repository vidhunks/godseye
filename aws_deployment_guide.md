# GodsEye AWS Deployment Guide

This guide is written for a beginner who wants the project to be simple to deploy, stable, and presentable in front of a company.

Recommended approach:

- One EC2 instance for the whole stack.
- Docker Compose for the app services.
- A reverse proxy in front of the frontend and API.
- HTTPS with a domain name so the site looks professional.

This is the easiest path that still looks polished.

## What you will deploy

- React/Vite frontend
- FastAPI backend
- Neo4j database
- Optional reverse proxy for HTTPS and clean URLs

## 1. Create the AWS server

### Do this in the AWS console

- [ ] Open EC2 and launch a new instance.
- [ ] Name it `godseye-prod`.
- [ ] Use `Amazon Linux 2023`.
- [ ] Choose `t3.small` if you want the low-cost option mentioned in the earlier guide.
- [ ] Select or create an SSH key pair.

### Security group

Open these ports:

- [ ] `22` for SSH from your IP only
- [ ] `80` for HTTP
- [ ] `443` for HTTPS

Keep these private unless you specifically need them:

- [ ] `7474` for Neo4j Browser
- [ ] `7687` for Neo4j Bolt
- [ ] `8000` only if you want to test the backend directly
- [ ] `3000` only if you want to test the frontend directly

For a smooth public site, the final public entry point should be `80` and `443` only.

## 2. Connect to the server

Use SSH from your computer:

```bash
ssh -i "your-key.pem" ec2-user@<your-ec2-public-ip>
```

## 3. Install Docker

Run these commands on the EC2 instance:

```bash
sudo dnf update -y
sudo dnf install -y git docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

Log out and back in after adding the user to the `docker` group.

Install Docker Compose if needed:

```bash
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.26.1/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
```

## 4. Add swap space

This helps a small EC2 instance handle builds and Neo4j more smoothly.

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

## 5. Clone the project

```bash
git clone https://github.com/vidhunks/godseye.git
cd godseye
```

## 6. Set up the backend environment file

Create `backend/.env` from `backend/.env.example`.

The current code requires these values to exist:

```env
APP_NAME=GodsEye
APP_VERSION=1.0.0
APP_ENV=production
DEBUG=False
HOST=0.0.0.0
PORT=8000

NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=godseye
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
```

If you later add real PostgreSQL, Redis, or RabbitMQ services, you can replace the placeholder values.

## 7. Review the Docker setup

The current compose file starts:

- Neo4j
- FastAPI backend
- React frontend

It maps:

- Neo4j Browser on `7474`
- Neo4j Bolt on `7687`
- Backend on `8000`
- Frontend on `3000`

That is enough for a working deployment, but not yet the most polished public setup.

## 8. Start the app

From the `infrastructure/` folder:

```bash
cd infrastructure
docker compose up --build -d
```

## 9. Check that it works

After the containers start, verify these URLs:

- [ ] Frontend: `http://<ec2-public-ip>:3000`
- [ ] Backend: `http://<ec2-public-ip>:8000`
- [ ] Neo4j Browser: `http://<ec2-public-ip>:7474`

What to confirm:

- [ ] The frontend loads without errors.
- [ ] The backend health and API routes respond.
- [ ] Neo4j starts and keeps its data between restarts.
- [ ] The frontend can call the backend through `/api`.

## 10. Make it look professional

If you want the site to impress a company, add a domain and HTTPS.

Recommended public setup:

- [ ] Point a DuckDNS hostname to the EC2 public IP.
- [ ] Put Nginx in front of the app.
- [ ] Terminate HTTPS with Let’s Encrypt.
- [ ] Keep the application behind the proxy so users only see one clean public URL.

If you add Nginx later, make sure:

- [ ] `80` redirects to `443`
- [ ] `/` serves the frontend
- [ ] `/api` forwards to the backend
- [ ] `7474`, `7687`, and `8000` are not public unless you truly need them

## 11. Good beginner workflow

If you are new to AWS, use this order:

1. Get the server running with Docker Compose first.
2. Open the app on the EC2 public IP.
3. Make sure the backend and Neo4j work.
4. Add a domain name.
5. Add HTTPS last.

That keeps the process simple and reduces mistakes.

## 12. Common problems

- [ ] If Docker commands fail, re-check that your user is in the `docker` group.
- [ ] If the backend does not start, re-check `backend/.env`.
- [ ] If the frontend loads but the API fails, confirm the backend is running and the `/api` path is correct.
- [ ] If the instance runs out of memory, keep the swap file enabled.
- [ ] If Neo4j is not reachable, make sure port `7687` is available inside the Docker network and that the volume is mounted.

## 13. What is still missing for a fully polished production deployment

- [ ] A committed Nginx config in the repo
- [ ] A committed HTTPS certificate setup
- [ ] Backend CORS support if you use separate domains
- [ ] AWS infrastructure-as-code

If you want, I can turn this into a full production runbook next, including the Nginx config and the exact Docker Compose changes needed for HTTPS.
