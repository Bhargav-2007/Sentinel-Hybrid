# Permitted & Isolated Test Fixtures Inventory

This document details all test fixtures, benchmarks, and sandbox simulators that remain in the repository. As required by the audit standard, all of these fixtures are strictly isolated within `tests/`, `fixtures/`, `benchmarks/`, and `simulators/`, and are never imported or executed in production runtime paths.

---

## 1. Automated Test Fixtures

| Component | Path | Purpose | Isolation Verification |
|---|---|---|---|
| **Model 1 Unit Tests** | `backend-model1/tests/unit/test_cameras.py` | Schema boundary tests (invalid lat/lon, invalid RTSP URLs, CSV parsing). | Uses `unittest.mock.AsyncMock` inside test methods only. Never imported in `app/`. |
| **Model 1 API Tests** | `backend-model1/tests/integration/test_api.py` | FastAPI endpoint contract and status code tests. | Skipped when external DB is offline; uses mock test database for isolated CI. |
| **Orchestrator Tests** | `backend-orchestrator/tests/test_platform.py` | Section 65B hash chaining and correlation verification. | Uses ASGI transport with test client. |
| **AI Detection Tests** | `ai-detection/tests/test_ai_advanced.py` | OCR fusion, Levenshtein distance, and color extraction algorithms. | Pure mathematical test cases on static sample vectors. |
| **Sentinel Evaluator Tests** | `sentinel_evaluator/tests/test_evaluator.py` | Self-tests for scoring engine, requirements schema, and SQLite storage. | Evaluator framework test suite. |

---

## 2. Sandbox Development Simulators

| Simulator | Path | Purpose | Isolation Verification |
|---|---|---|---|
| **Mock External APIs** | `simulators/mock-external-apis/main.py` | Standalone FastAPI service simulating VAHAN, SARTHI, eGujCop endpoints for local offline developer testing. | Runs in standalone container on `:8090`. Never bundled or imported in production backend services. |
| **Mock Hikvision/Dahua VMS** | `simulators/mock-vms/` | Standalone NVR servers providing mock ISAPI channel lists for testing Model 3 Java SDK. | Runs in standalone container on `:9001`/`:9002`. Completely isolated from production VMS installations. |
| **RTSP Live Stream Simulator** | `simulators/rtsp-simulator/` | MediaMTX / RTSP stream rebroadcaster for offline pipeline testing. | Standalone Docker container. |

---

## 3. Policy Enforcement

- Continuous integration scanner `scripts/scan-no-mock-data.py --ci` validates that no file under `app/`, `cmd/`, `internal/`, `src/` imports from `simulators/` or `tests/`.
- `DATA_MODE=real` is enforced across all service configuration files.
