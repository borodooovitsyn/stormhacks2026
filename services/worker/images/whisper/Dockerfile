# CPU Whisper image. Model baked at build time so runtime needs no network.
FROM python:3.11-slim

RUN pip install --no-cache-dir faster-whisper huggingface_hub

# Bake the tiny model into the image at a fixed path (loaded directly, no HF hub at runtime).
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-tiny', local_dir='/models/tiny')"

COPY transcribe.py /app/transcribe.py
ENV WHISPER_MODEL=/models/tiny
ENTRYPOINT ["python", "/app/transcribe.py"]
