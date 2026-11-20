# Backend image — FastAPI + uvicorn. Build from the repo root:
#   docker build -f backend/Dockerfile .
# Env comes from the host / compose env_file (.env); never bake keys in.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
EXPOSE 8000
CMD ["uvicorn", "backend.app.api:app", "--host", "0.0.0.0", "--port", "8000"]
