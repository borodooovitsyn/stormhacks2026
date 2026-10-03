.PHONY: setup api worker test lint db clean

VENV = .venv
PYTHON ?= python3.12
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip

setup:  ## create venv and install deps
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"
	@echo "Done. Run: source $(VENV)/bin/activate"

api:  ## run the FastAPI backend (docs at http://localhost:8000/docs)
	$(VENV)/bin/uvicorn services.api.app.main:app --reload --port 8000

worker:  ## run the GPU worker (fake metrics without a GPU) -- stub until services/worker lands
	@echo "worker not implemented yet (commit #6). Owner: desktop/worker person."

test:  ## run the test suite
	$(VENV)/bin/pytest -q

lint:  ## lint and format-check
	$(VENV)/bin/ruff check .

db:  ## start local TimescaleDB (Tiger Data compatible) -- stub until db/ lands
	docker compose up -d db

clean:
	rm -rf $(VENV) .pytest_cache **/__pycache__
