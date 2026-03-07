# DevManager Monorepo

A full-stack application for managing development tasks, projects, and payroll.

## Architecture

This project is a monorepo managed by NPM Workspaces and contains the following packages:

- **`apps/api`**: The backend API built with Express, Mongoose (MongoDB), and TypeScript.
- **`apps/web`**: The frontend application built with React, Vite, and TypeScript.
- **`apps/desktop`**: A dedicated native Windows app built with C# and WPF.
- **`packages/shared`**: Shared TypeScript types and utilities used by both `api` and `web`.

## Prerequisites

- Node.js (v20+)
- .NET 8 SDK (for desktop app)
- Docker & Docker Compose (for containerized deployment)
- MongoDB & Redis (if running locally without Docker)

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Servers**
   ```bash
   npm run dev
   ```
   This starts API (port 3030) and Web app.

3. **Start Native Desktop App**
   ```bash
   dotnet run --project apps/desktop/DevManager.Desktop.csproj
   ```
   This launches the dedicated Windows desktop application.

## Docker Deployment (Production)

This project is Docker-ready and can be deployed as a single container where the API serves the built frontend files.

### 1. Build & Run with Docker Compose (Recommended)

```bash
docker-compose up -d --build
```

- **App**: `http://localhost:3030` (or configured domain)
- **MongoDB**: `mongodb://localhost:27017`
- **Redis**: `redis://localhost:6379`

### 2. Deployment Configuration

Environment variables can be set in `docker-compose.yml` or passed to the `docker run` command.

| Variable | Default (Docker) | Description |
| :--- | :--- | :--- |
| `PORT` | `3030` | API Port |
| `MONGO_URI` | `mongodb://admin:password123@mongo:27017...` | MongoDB Connection String |
| `REDIS_URL` | `redis://redis:6379` | Redis Connection String |
| `JWT_SECRET` | `supersecretkey` | JWT Secret used for auth |
| `VITE_API_URL` | `https://beta.devregion.com/api` | API URL baked into frontend build |

## Admin Account Seeding

To create the default admin account (`ali@boldwp.com` / `password123`), run the following command.

### In Docker (Post-Deployment)

```bash
# Get the container ID
docker ps

# Run the seed script inside the container
docker exec -it <container_id> sh -c "cd apps/api && npm run seed:admin"
```

### Locally

Ensure your local MongoDB is running, then:

```bash
npm run seed:admin --workspace=apps/api
```

## Structure

```text
apps/
  api/      # Express Backend
  web/      # React Frontend
  desktop/  # Native Windows WPF App
packages/
  shared/   # Shared Types/Schemas
Dockerfile
docker-compose.yml
package.json
```
