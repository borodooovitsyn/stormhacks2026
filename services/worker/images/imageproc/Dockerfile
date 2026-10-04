# Demo workload #2 (image processing). Proves the worker runs ANY image, not a menu.
FROM python:3.11-slim
RUN pip install --no-cache-dir pillow
COPY proc.py /app/proc.py
ENTRYPOINT ["python", "/app/proc.py"]
