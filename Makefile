.PHONY: setup api worker test lint db clean whisper-cpu whisper-cuda imageproc mps-on

VENV = .venv
PYTHON ?= python3.12
N ?= 3
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip

setup:  ## create venv and install deps
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"
	@echo "Done. Run: source $(VENV)/bin/activate"

api:  ## run the FastAPI backend (docs at http://localhost:8000/docs)
	$(VENV)/bin/uvicorn services.api.app.main:app --reload --port 8000

worker:  ## run the GPU worker (fake metrics, needs `make api` running)
	$(VENV)/bin/python -m services.worker

workers:  ## launch N workers to show one job sharded across GPUs (make workers N=3)
	bash scripts/run-workers.sh $(N)

whisper-cpu:  ## build the CPU whisper image (any laptop)
	docker build -t gpu-share/whisper:cpu services/worker/images/whisper

whisper-cuda:  ## build the GPU whisper image (ROG / NVIDIA box)
	docker build -f services/worker/images/whisper/Dockerfile.cuda -t gpu-share/whisper:cuda services/worker/images/whisper

imageproc:  ## build the demo image-processing workload (proves any image runs)
	docker build -t gpu-share/imageproc:cpu services/worker/images/imageproc

mps-on:  ## start NVIDIA MPS on the provider host (enables % GPU caps; Linux/WSL2)
	nvidia-cuda-mps-control -d && echo "MPS daemon started"

test:  ## run the test suite
	$(VENV)/bin/pytest -q

lint:  ## lint and format-check
	$(VENV)/bin/ruff check .

db:  ## start local TimescaleDB (Tiger Data compatible) -- stub until db/ lands
	docker compose up -d db

clean:
	rm -rf $(VENV) .pytest_cache **/__pycache__
