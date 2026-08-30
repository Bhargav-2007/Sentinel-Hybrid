# INTEGRATION REFERENCE · SENTINEL SANDBOX
## Consuming the Sentinel Camera Grid

A guide for teams connecting to the Sentinel sandbox — how to open a live feed, how the stream behaves at the protocol layer, and the integration mistakes that cause most client-side failures.

---

## 1. What You Are Connecting To

Every camera is published as a **live RTP/RTSP stream**. One second of video takes one second to arrive, frames carry monotonic presentation timestamps (PTS), and there is no seeking, no byte-range fetching, and no way to run ahead of real time. Treat each endpoint as you would a physical camera on an operational surveillance network.

### Protocol Endpoints

| Protocol | Endpoint Template | Intended Use Case |
|---|---|---|
| **RTSP** | `rtsp://<host>:8554/stream/<id>` | AI inference (OpenCV, GStreamer, FFmpeg, DeepStream) |
| **WebRTC (WHEP)** | `http://<host>:8889/stream/<id>/whep` | Low-latency browser preview |
| **HLS** | `http://<host>/live/stream/<id>/index.m3u8` | Dashboards, mobile, restricted networks |

### Dynamic Catalogue Discovery

**Always start from the catalogue rather than hard-coding endpoints:**

```bash
curl -s http://<host>/api/ingest
```

It returns every camera with its `id`, `location`, `codec`, `live` status, stream properties, and all three URLs. Camera IDs and the set of available cameras can change dynamically; **the catalogue is the contract, the URL pattern is not.**

---

## 2. Connecting to Feeds

### OpenCV (Python)

```python
import os
# CRITICAL: Force RTSP over TCP via FFmpeg capture options
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
import cv2

cap = cv2.VideoCapture("rtsp://<host>:8554/stream/1", cv2.CAP_FFMPEG)
while True:
    ok, frame = cap.read()
    if not ok:
        break # Reconnect with exponential backoff — see §3
    # ALWAYS drive timing from PTS, never from arrival time
    pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
    ...
```

### GStreamer

#### H.264 Streams:
```bash
gst-launch-1.0 rtspsrc location=rtsp://<host>:8554/stream/1 protocols=tcp latency=200 \
  ! rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! fakesink
```

#### H.265 (HEVC) Streams:
```bash
gst-launch-1.0 rtspsrc location=rtsp://<host>:8554/stream/1 protocols=tcp latency=200 \
  ! rtph265depay ! h265parse ! avdec_h265 ! videoconvert ! fakesink
```

### FFmpeg / ffprobe

```bash
# Playback test
ffplay -rtsp_transport tcp rtsp://<host>:8554/stream/1

# Probe stream codec, resolution, and PTS structure
ffprobe -rtsp_transport tcp rtsp://<host>:8554/stream/1
```

### NVIDIA DeepStream

Use `nvurisrcbin` or `uridecodebin` with the RTSP URI and configure `select-rtp-protocol=4` (TCP):

```ini
[source0]
enable=1
type=4
uri=rtsp://<host>:8554/stream/1
num-sources=1
gpu-id=0
select-rtp-protocol=4
```

Streams are H.264 or H.265; both decode natively on `nvv4l2decoder` without CPU demuxing.

---

## 3. Do's and Don'ts

### ✅ DO — Force RTSP over TCP
UDP is accepted by the server but frequently fails across NAT and corporate firewalls. Partial UDP packet delivery causes corrupted/torn macroblocks that can masquerade as AI model bugs. Set `rtsp_transport=tcp` in every client. If port 8554 is blocked on your network, use the HLS fallback endpoint.

### ❌ DON'T — Trust the Reported Frame Rate
OpenCV's `CAP_PROP_FPS` (and equivalent properties in other media libraries) often reflects nominal stream container metadata rather than the real-time delivery rate. Using that static number to convert pixels-per-frame into speed, dwell time, or any time-derived metric will produce incorrect results. Measure the real rate yourself, or ignore declared frame rate entirely and rely strictly on timestamps.

### ✅ DO — Drive All Timing from PTS, Never from Arrival Time
Use `CAP_PROP_POS_MSEC` (OpenCV), the buffer PTS (GStreamer), or RTP timestamps. Do **not** use wall-clock time at the instant a frame is read.
When a client connects, the gateway replays its buffered group-of-pictures (GOP) so the decoder can immediately lock onto a keyframe. The first second or two of frames may therefore arrive faster than real time. A tracking pipeline that timestamps by frame arrival will compute impossible velocities immediately after connection. Kalman filters and multi-object trackers must always be fed **PTS deltas**.

### ❌ DON'T — Assume a Constant Frame Rate
Frame intervals across live networks are not guaranteed to be uniform. Pipelines must tolerate inter-frame gaps without treating them as a disconnect, and motion models must use actual elapsed PTS between frames rather than a fixed cadence.

### ✅ DO — Reconnect Automatically, with Backoff
Feeds are supervised and may restart periodically. Expect occasional brief interruptions. Reconnect with exponential backoff (starting at ~2 s, capping at ~30 s). Do not reconnect in a tight, unthrottled loop.

### ❌ DON'T — Treat Decode Warnings at Join as Fatal
The grid includes both H.264 and H.265 feeds. Attaching mid-stream can produce decoder log messages such as `Error constructing the frame RPS` or `Could not find ref with POC` until the first IDR/I-frame arrives. This is normal and self-corrects. Pipelines that abort on the first decoder error will bounce endlessly on those streams.

### ❌ DON'T — Assume a Uniform Grid
Cameras differ in resolution (1080p, 720p), codec (H.264, H.265), frame rate (15–30 fps), and bitrate. Read per-camera properties dynamically from `/api/ingest` and size batching, decoders, and buffers accordingly. A fixed-shape inference batch across every camera will fail unscaled.

### ✅ DO — Expect a Scene Discontinuity
Each feed is a continuous loop recording. At the loop point the scene cuts abruptly, similar to a physical camera reboot. Long-lived state — background models, re-identification galleries, object track IDs — must recover gracefully from a hard cut rather than assuming infinite spatial continuity.

### ❌ DON'T — Plan Around Obtaining Copies of Footage
There is no file download. The grid is consumed live over RTSP/WebRTC/HLS, and that is what evaluation exercises. `/stream/<id>` is the browser playback fallback: it answers range requests for a media player, so pulling it with plain `curl` or `wget` yields a partial file that looks complete. Build against live capture from the start.

### ❌ DON'T — Publish to the Gateway
Consume only. Do not push streams to any path, and do not call the gateway's administrative control API.

### ✅ DO — Pace Your Load
Each connected client receives its own copy of the stream. Open only the cameras you are actively processing, and close captures as soon as processing completes.

---

## 4. Pre-Submission Compliance Checklist

- [x] **RTSP over TCP**: Every client forces TCP transport (`rtsp_transport=tcp` / `protocols=tcp` / `select-rtp-protocol=4`).
- [x] **PTS-Driven Timing**: No velocity or tracking logic depends on `CAP_PROP_FPS` or arrival time; all timing uses PTS deltas.
- [x] **Gap Tolerance**: Inter-frame jitter and variable intervals do not crash or stall the processing loop.
- [x] **Exponential Backoff**: Reconnection uses exponential backoff starting at ~2s, capped at ~30s.
- [x] **Non-Fatal Decode Warnings**: Initial decode warnings (`RPS`, `POC`, missing reference) on join are logged as debug, not treated as fatal disconnects.
- [x] **Dynamic Ingest**: Camera list, codecs, and stream properties are queried from `/api/ingest`.
- [x] **Mixed Codec & Resolution Handling**: Pipeline transparently handles H.264, H.265, and variable aspect ratios/resolutions.
- [x] **Scene Discontinuity Recovery**: Object tracking and re-ID state recover cleanly across loop hard cuts.

---

## 5. Support & Triage

When reporting feed issues, provide:
1. **Camera ID** (e.g. `stream/1` or `HOME-LIVE-001`)
2. **Exact URL** accessed
3. **Client library & version** (e.g. OpenCV 4.10, GStreamer 1.24, PyAV 12.0)
4. **UTC timestamp** of occurrence
5. **Client-side error log snippet**

> [!NOTE]
> Always confirm the camera's `live` status in `/api/ingest` before reporting it as down.
