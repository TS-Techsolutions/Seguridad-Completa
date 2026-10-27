FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY contracts contracts
COPY backend backend
EXPOSE 8010
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8010"]
