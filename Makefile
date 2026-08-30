# =============================================================================
# Gujarat Sentinel — Hybrid CCTV Platform
# Makefile — Single-command operations
# =============================================================================

.PHONY: all start stop status doctor verify build up down demo scenario test test-unit test-integration \
        test-contract test-load test-security test-hackathon seed logs \
        clean format lint migrate help

DOCKER_COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml
DEMO_COMPOSE_FILE := docker-compose.demo.yml
ENV_FILE := .env
PYTHON := python

# Colours
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# Default target
all: help

## ─── Sentinel Full-Stack Runner ──────────────────────────────────────────────

## start: Start complete full-stack platform using canonical runner
start:
	@$(PYTHON) scripts/run.py --start

## stop: Gracefully stop all application services
stop:
	@$(PYTHON) scripts/run.py --stop

## status: View live status of all services, ports, and health probes
status:
	@$(PYTHON) scripts/run.py --status

## doctor: Run full diagnostic environment & dependency check
doctor:
	@$(PYTHON) scripts/run.py --doctor

## verify: Run end-to-end multi-service health and smoke tests
verify:
	@$(PYTHON) scripts/run.py --verify

## ─── Development ─────────────────────────────────────────────────────────────

## up: Start full development stack (all services + infrastructure)
up:
	@echo "$(CYAN)Starting Sentinel platform...$(RESET)"
	@cp -n $(ENV_FILE).example $(ENV_FILE) 2>/dev/null || true
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d
	@echo "$(GREEN)Platform started. Access:"
	@echo "  API Gateway:    http://localhost:8000"
	@echo "  Model 1 (GIS):  http://localhost:8001/docs"
	@echo "  Model 2 (View): http://localhost:8002/docs"
	@echo "  Model 3 (Fed):  http://localhost:8003/swagger-ui"
	@echo "  Model 4 (VMS):  http://localhost:8004"
	@echo "  Grafana:        http://localhost:3000 (admin/grafana_admin_pass)"
	@echo "  Keycloak:       http://localhost:8080 (admin/admin_password)"
	@echo "  OpenSearch:     http://localhost:9200"
	@echo "  Kafka UI:       http://localhost:8082$(RESET)"

## down: Stop all services
down:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down

## restart: Restart all services
restart: down up

## logs: Tail logs from all services
logs:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f

## logs-svc: Tail logs from specific service (usage: make logs-svc SVC=model1)
logs-svc:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f $(SVC)

## ─── Demo ────────────────────────────────────────────────────────────────────

## demo: Start minimal demo stack with 50 pre-seeded cameras
demo:
	@echo "$(CYAN)Starting Sentinel DEMO (50 cameras)...$(RESET)"
	@cp -n $(ENV_FILE).example $(ENV_FILE) 2>/dev/null || true
	$(DOCKER_COMPOSE) -f $(DEMO_COMPOSE_FILE) --env-file $(ENV_FILE) up -d
	@sleep 15
	@$(MAKE) seed-demo
	@echo "$(GREEN)Demo ready! Access:"
	@echo "  Gateway:     http://localhost:8000"
	@echo "  Model1 API:  http://localhost:8001/docs"
	@echo "  Grafana:     http://localhost:3000$(RESET)"

## seed: Seed all test data (50 cameras, vehicles, watchlist)
seed:
	@echo "$(CYAN)Seeding test data...$(RESET)"
	@python scripts/seed/seed_cameras.py --count 50
	@python scripts/seed/seed_watchlist.py
	@python scripts/seed/seed_vehicles.py
	@echo "$(GREEN)Seeding complete!$(RESET)"

## seed-demo: Seed minimal demo data
seed-demo:
	@python scripts/seed/seed_cameras.py --count 50 --demo
	@python scripts/seed/seed_watchlist.py --demo
	@python scripts/seed/seed_vehicles.py --demo

## scenario: Run full hackathon E2E scenario
## (onboard 50 cameras → trace vehicle → watchlist alert)
scenario:
	@echo "$(CYAN)Running Sentinel hackathon scenario...$(RESET)"
	@python scripts/demo/hackathon_scenario.py
	@echo "$(GREEN)Scenario complete! Check Grafana for visualisations.$(RESET)"

## ─── Build ───────────────────────────────────────────────────────────────────

## build: Build all Docker images
build:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build

## build-svc: Build specific service (usage: make build-svc SVC=model1)
build-svc:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build $(SVC)

## ─── Database ────────────────────────────────────────────────────────────────

## migrate: Run Alembic migrations for all Python services
migrate:
	@echo "$(CYAN)Running database migrations...$(RESET)"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec model1 alembic upgrade head
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec model2 alembic upgrade head
	@echo "$(GREEN)Migrations complete!$(RESET)"

## migrate-model1: Run Model 1 migrations only
migrate-model1:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec model1 alembic upgrade head

## ─── Testing ─────────────────────────────────────────────────────────────────

## test: Run all tests
test: test-unit test-integration test-contract

## test-all: Run all tests including load and security
test-all: test test-load test-security test-hackathon

## test-unit: Run unit tests for all services
test-unit:
	@echo "$(CYAN)Running unit tests...$(RESET)"
	cd backend-model1 && python -m pytest tests/unit -v --tb=short
	cd backend-model2 && python -m pytest tests/unit -v --tb=short
	cd backend-model4 && go test ./... -v -run Unit
	@echo "$(GREEN)Unit tests passed!$(RESET)"

## test-integration: Run integration tests (requires running stack)
test-integration:
	@echo "$(CYAN)Running integration tests...$(RESET)"
	cd backend-model1 && python -m pytest tests/integration -v --tb=short
	cd backend-model2 && python -m pytest tests/integration -v --tb=short
	@echo "$(GREEN)Integration tests passed!$(RESET)"

## test-contract: Run contract tests (OpenAPI + Pact)
test-contract:
	@echo "$(CYAN)Running contract tests...$(RESET)"
	cd tests/contract && python -m pytest -v --tb=short
	@echo "$(GREEN)Contract tests passed!$(RESET)"

## test-load: Run k6 load test (50 cameras, 1000 req/s)
test-load:
	@echo "$(CYAN)Running load tests...$(RESET)"
	k6 run tests/load/k6_load_test.js
	@echo "$(GREEN)Load tests complete!$(RESET)"

## test-security: Run OWASP ZAP security baseline scan
test-security:
	@echo "$(CYAN)Running security tests...$(RESET)"
	docker run -t owasp/zap2docker-stable zap-baseline.py \
		-t http://localhost:8000 \
		-c tests/security/zap_baseline.conf \
		-r tests/security/report.html
	@echo "$(GREEN)Security scan complete! Report: tests/security/report.html$(RESET)"

## test-hackathon: Run full hackathon E2E scenario test
test-hackathon:
	@echo "$(CYAN)Running hackathon E2E tests...$(RESET)"
	cd tests/hackathon && python -m pytest test_e2e_scenario.py -v --tb=short
	@echo "$(GREEN)Hackathon scenario tests passed!$(RESET)"

## ─── Code Quality ────────────────────────────────────────────────────────────

## format: Format all code
format:
	cd backend-model1 && black app tests && isort app tests
	cd backend-model2 && black app tests && isort app tests
	cd backend-model4 && gofmt -w .
	cd backend-hybrid && gofmt -w .

## lint: Run linters
lint:
	cd backend-model1 && ruff check app tests && mypy app
	cd backend-model2 && ruff check app tests && mypy app
	cd backend-model4 && golangci-lint run
	cd backend-hybrid && golangci-lint run
	cd backend-model3 && mvn checkstyle:check

## ─── Contracts ───────────────────────────────────────────────────────────────

## contracts: Generate code from OpenAPI / Protobuf contracts
contracts:
	@echo "$(CYAN)Generating code from contracts...$(RESET)"
	# Python models from OpenAPI
	cd contracts && python scripts/generate_python.py
	# Java models from OpenAPI
	cd contracts && python scripts/generate_java.py
	# Go models from Protobuf
	cd contracts && protoc --go_out=../backend-model4 \
		--go-grpc_out=../backend-model4 proto/*.proto
	@echo "$(GREEN)Contract code generated!$(RESET)"

## ─── Documentation ────────────────────────────────────────────────────────────

## docs: Serve documentation locally
docs:
	@echo "$(CYAN)Opening documentation...$(RESET)"
	@python -m http.server 8888 -d docs &
	@echo "Docs: http://localhost:8888"

## ─── Cleanup ─────────────────────────────────────────────────────────────────

## clean: Remove all containers, volumes, and generated files
clean:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans
	$(DOCKER_COMPOSE) -f $(DEMO_COMPOSE_FILE) down -v --remove-orphans 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(RESET)"

## ─── Help ────────────────────────────────────────────────────────────────────

## help: Show this help message
help:
	@echo "$(CYAN)Gujarat Sentinel — Hybrid CCTV Platform$(RESET)"
	@echo "$(YELLOW)Usage: make [target]$(RESET)"
	@echo ""
	@grep -E '^##' $(MAKEFILE_LIST) | grep -v '───' | \
		sed 's/## //g' | \
		awk -F: '{printf "  $(GREEN)%-25s$(RESET) %s\n", $$1, $$2}'
