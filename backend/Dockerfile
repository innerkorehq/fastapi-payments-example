FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY fastapi-payments-example/backend/requirements.txt .
# Copy fastapi-payments source
COPY fastapi-payments /fastapi-payments

# Copy application code
COPY fastapi-payments-example/backend/ .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install -e /fastapi-payments[cashfree]

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]