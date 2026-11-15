FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY common ./common
COPY metricas ./metricas

EXPOSE 8012
CMD ["uvicorn", "metricas.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8012"]
