# Inventory of Removed Mock & Synthetic Data Logic

This document catalogs all artificial data patterns, mock functions, and synthetic fallback generators permanently removed from the production runtime of the Gujarat Sentinel Hybrid Platform.

---

## 1. Backend Orchestrator

### 1.1 Fabricated Sighting Fallbacks
- **File**: `backend-orchestrator/app/services/ai_orchestrator.py`
- **Removed Code**:
  ```python
  # PREVIOUSLY (REMOVED):
  else:
      sightings_list = [
          {"camera_id": "1", "confidence": 0.98, "timestamp": datetime.now(timezone.utc).isoformat()},
          {"camera_id": "3", "confidence": 0.96, "timestamp": datetime.now(timezone.utc).isoformat()},
          {"camera_id": "5", "confidence": 0.94, "timestamp": datetime.now(timezone.utc).isoformat()},
      ]
  ```
- **Replacement**: Route reconstruction only triggers if real sightings exist in the PostGIS database. If no sightings exist, `reconstructed_corridor_route` returns `None`.

### 1.2 Fabricated VAHAN Records
- **File**: `backend-orchestrator/app/services/ai_orchestrator.py`
- **Removed Code**: Fabricated chassis numbers (`MA3EW2S00G...`), engine numbers (`K12M...`), and fictional insurance dates.
- **Replacement**: Authentic database records indicating `AUTHENTICATED_POLICE_HOTLIST` with verified case numbers and FIR references, or clean unflagged status.

---

## 2. Model 2 (ANPR & Video Analytics)

### 2.1 `_mock_read_plates` OCR Fallback
- **File**: `backend-model2/app/pipeline/anpr_engine.py`
- **Removed Code**: Deterministic fake plate generator using MD5 frame hashing and random district/series choices.
- **Replacement**: When PaddleOCR is offline or fails to resolve characters with sufficient confidence, the engine returns `[]` (empty list).

### 2.2 Synthetic Vehicle Corridor Generator
- **File**: `backend-model2/app/workers/corridor_tracker.py`
- **Removed Code**: Continuous random loop injecting fake detections with `random.uniform(0.91, 0.99)` and random PTS timestamps.
- **Replacement**: `RealCorridorAnalyticsWorker` calculating physical speeds from actual camera coordinates using the Haversine equation and monotonic PTS differences.

---

## 3. Frontend Situational Awareness Dashboard

### 3.1 Hardcoded Global Search Entities
- **File**: `frontend/src/shared/components/GlobalSearchModal.tsx`
- **Removed Code**: Static `mockEntities` array containing fictional vehicle records and alert IDs.
- **Replacement**: Dynamic live search that constructs navigation paths for querying actual vehicle dossiers, camera registries, and active alerts.

### 3.2 Artificial Presentation Timestamps & Hardcoded Watchlists
- **File**: `frontend/src/components/video/VideoPlayer.tsx`
- **Removed Code**: `Math.random() * 800000` initialization of PTS offsets and hardcoded `WATCHLIST_PLATES` array.
- **Replacement**: Epoch monotonic millisecond clock (`Date.now()`) and dynamic hotlist boolean flags delivered directly in the AI detection response payload.

### 3.3 Dashboard Telemetry Magic Numbers
- **File**: `frontend/src/features/analytics/AnalyticsPage.tsx`
- **Removed Code**: Fallback defaults (`|| 12.4%`, `|| 4.2 GB`) when host metrics were loading.
- **Replacement**: Real-time measured metrics from kernel/Prometheus or explicit `'N/A'` indicators.
