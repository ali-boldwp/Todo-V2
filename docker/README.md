# Dev Docker Setup

This folder contains a development-only Docker stack for the monorepo.

## Services

- `web`: Vite dev server (`http://localhost:3000`)
- `api`: Express API with `nodemon` (`http://localhost:3030`)
- `mongo`: MongoDB (`mongodb://localhost:27017`)
- `redis`: Redis (`redis://localhost:6379`)

## Start

From the project root:

```bash
docker compose -f docker/compose.dev.yml up --build
```

Run in detached mode:

```bash
docker compose -f docker/compose.dev.yml up --build -d
```

## Stop

```bash
docker compose -f docker/compose.dev.yml down
```

To remove volumes too:

```bash
docker compose -f docker/compose.dev.yml down -v
```

## Notes

- Source code is bind-mounted, so changes on host are reflected in containers.
- `api.env` and `web.env` contain default development values.
- Frontend `/api` proxy points to `api:3030` inside Docker.
