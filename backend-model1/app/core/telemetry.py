"""
Gujarat Sentinel — Model 1
OpenTelemetry Setup

Configures distributed tracing with OTLP export to the OpenTelemetry Collector,
which forwards to Jaeger (traces) and Prometheus (metrics).
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)

# Configure structlog for JSON output
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

# Optional OpenTelemetry imports
try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    OPENTELEMETRY_AVAILABLE = False


def setup_telemetry(service_name: str) -> None:
    """Configure OpenTelemetry SDK with OTLP exporter if available."""
    if not OPENTELEMETRY_AVAILABLE:
        logger.info(
            "opentelemetry_skipped",
            service=service_name,
            reason="opentelemetry packages not installed (install opentelemetry-api opentelemetry-sdk for distributed tracing)"
        )
        return

    from app.config import get_settings

    settings = get_settings()

    try:
        resource = Resource.create({
            "service.name": service_name,
            "service.version": settings.service_version,
            "service.namespace": settings.otel_service_namespace,
            "deployment.environment": settings.environment,
        })

        sampler = ParentBasedTraceIdRatio(settings.otel_traces_sampler_arg)
        provider = TracerProvider(resource=resource, sampler=sampler)

        try:
            otlp_exporter = OTLPSpanExporter(
                endpoint=settings.otel_exporter_otlp_endpoint,
                insecure=True,
            )
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info("otel_exporter_configured", endpoint=settings.otel_exporter_otlp_endpoint)
        except Exception as e:
            logger.warning("otel_exporter_setup_failed", error=str(e))

        trace.set_tracer_provider(provider)

        # Auto-instrument FastAPI and SQLAlchemy
        FastAPIInstrumentor().instrument()
        SQLAlchemyInstrumentor().instrument()

        logger.info("opentelemetry_configured", service=service_name)
    except Exception as err:
        logger.warning("opentelemetry_init_failed", error=str(err))

