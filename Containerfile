# Frontend NoteBoard
FROM docker.io/library/node:22-alpine

LABEL org.opencontainers.image.title="noteboard-frontend" \
      org.opencontainers.image.description="Frontend NoteBoard (HTML/CSS/JS + Express) - UTS Pengembangan dan Operasi" \
      org.opencontainers.image.version="1.0.0"

# BACKEND_URL memakai nama container backend (DNS dari podman network)
ENV NODE_ENV=production \
    PORT=8080 \
    APP_ENV=production \
    BACKEND_URL=http://noteboard-backend:3000

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY public ./public

USER node

EXPOSE 8080

CMD ["node", "server.js"]
