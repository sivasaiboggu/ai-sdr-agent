# Frontend image — Vite production build served by `vite preview`.
# For real production hosting use Vercel (see README Deployment);
# this image exists so `docker compose up` demos the dashboard locally.
# VITE_API_URL is baked in at build time: pass the backend origin, e.g.
#   docker build --build-arg VITE_API_URL=http://localhost:8000 -f frontend/Dockerfile .
FROM node:20-alpine
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
EXPOSE 5173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
