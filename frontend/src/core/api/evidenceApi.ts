/**
 * Gujarat Sentinel — Section 65B Evidence API
 *
 * Connects the frontend to the Orchestrator evidence endpoints.
 * Generates certified SHA-256 HMAC-signed evidence packages for court submission.
 */

import { apiClient } from './client';

export interface EvidencePackage {
  package_id: string;
  incident_number: string;
  alert_id: string;
  alert_type: string;
  severity: string;
  title: string;
  target_plate: string;
  camera_id: string;
  camera_name: string;
  district: string;
  gps_coordinates: { latitude: number; longitude: number };
  incident_timestamp: string;
  package_generated_at: string;
  snapshot_url?: string;
  video_clip_url?: string;
  section65b_declaration?: string;
  hmac_sha256_hash: string;
  hmac_algorithm: string;
  chain_of_custody?: any[];
}

export const evidenceApi = {
  /**
   * Generates a certified Section 65B evidence package for a given alert/incident.
   * Returns a signed JSON package with SHA-256 HMAC hash suitable for court submission.
   */
  generateEvidence: async (incidentId: string): Promise<EvidencePackage> => {
    return apiClient<EvidencePackage>(`/api/v1/evidence/generate/${incidentId}`, {
      method: 'POST',
    });
  },

  /**
   * Exports the full certified evidence dossier (evidence + chain of custody).
   */
  exportEvidence: async (incidentId: string): Promise<any> => {
    return apiClient<any>(`/api/v1/evidence/export/${incidentId}`);
  },

  /**
   * Verifies the cryptographic integrity of an evidence package.
   */
  verifyEvidence: async (
    evidenceMetadata: Record<string, any>,
    claimedHmacHash: string
  ): Promise<{ is_valid: boolean; status: string; message: string }> => {
    return apiClient<any>('/api/v1/evidence/verify', {
      method: 'POST',
      body: JSON.stringify({
        evidence_metadata: evidenceMetadata,
        claimed_hmac_hash: claimedHmacHash,
      }),
    });
  },

  /**
   * Downloads an evidence package as a JSON file directly to the browser.
   * The filename includes the plate and timestamp for easy filing.
   */
  downloadAsFile: (pkg: EvidencePackage, plate?: string) => {
    const filename = `sentinel-evidence-${plate || pkg.target_plate || pkg.package_id}-${
      new Date().toISOString().slice(0, 10)
    }.json`;

    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * One-shot: generate + download evidence package for an alert.
   */
  generateAndDownload: async (incidentId: string, plate?: string): Promise<EvidencePackage> => {
    const pkg = await evidenceApi.generateEvidence(incidentId);
    evidenceApi.downloadAsFile(pkg, plate);
    return pkg;
  },
};
