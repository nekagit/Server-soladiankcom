# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

# Security: Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Security: Create non-root user
RUN groupadd -r appuser && \
    useradd -r -g appuser -d /app -s /bin/false appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Security: Copy requirements first for better caching
COPY requirements.txt ./

# Security: Install dependencies as root, then clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y gcc && \
    apt-get autoremove -y && \
    rm -rf /root/.cache

# Security: Copy application code and set ownership
COPY --chown=appuser:appuser . ./

# Security: Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs /app/tmp && \
    chown -R appuser:appuser /app/data /app/logs /app/tmp

# Security: Switch to non-root user
USER appuser

# Security: Expose port
EXPOSE 8000

# Security: Health check without external dependencies
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

# Security: Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]