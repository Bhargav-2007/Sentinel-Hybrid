package in.gujarat.sentinel.model3.domain;

/**
 * Supported VMS vendor types.
 * Each type maps to a specific SDK adapter implementation.
 */
public enum VmsVendorType {
    HIKVISION,
    DAHUA,
    BOSCH,
    HANWHA,
    AXIS,
    MILESTONE,
    GENETEC,
    ONVIF_GENERIC;

    /**
     * Whether this vendor supports native SDK operations
     * (PTZ, event subscription, playback).
     */
    public boolean hasNativeSdk() {
        return this == HIKVISION || this == DAHUA || this == BOSCH;
    }

    /**
     * Whether this vendor supports ONVIF as a fallback.
     */
    public boolean supportsOnvif() {
        return true; // All modern VMS support ONVIF
    }
}
