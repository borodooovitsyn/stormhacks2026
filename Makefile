.PHONY: setup api worker test lint db clean

VENV = .venv
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip

setup:  ## create venv and install deps
	python3 -m venv $(VENV)
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
	@echo "db not implemented yet (commit #8). Owner: backend person."

clean:
	rm -rf $(VENV) .pytest_cache **/__pycache__
