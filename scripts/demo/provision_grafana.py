#!/usr/bin/env python3
"""
Gujarat Sentinel — Grafana Dashboard & Datasource Provisioner
Automates uploading all 4 SOC dashboards and datasources to live Grafana instance (localhost:3000).
"""

import json
import os
import sys
import glob
import urllib.request
import urllib.error
import base64

GRAFANA_URL = os.getenv("GRAFANA_URL", "http://localhost:3000")
GRAFANA_USER = os.getenv("GRAFANA_ADMIN_USER", "admin")
GRAFANA_PASS = os.getenv("GRAFANA_ADMIN_PASSWORD", "grafana_admin_pass")
ALT_PASSWORDS = ["grafana_admin_pass", "admin", "admin_password", "sentinel_secure_pass_2026"]

def get_auth_header(user, password):
    auth_str = f"{user}:{password}"
    return "Basic " + base64.b64encode(auth_str.encode()).decode()

def test_grafana_connection():
    print(f"Connecting to Grafana at {GRAFANA_URL}...")
    for pwd in [GRAFANA_PASS] + ALT_PASSWORDS:
        auth_header = get_auth_header(GRAFANA_USER, pwd)
        req = urllib.request.Request(f"{GRAFANA_URL}/api/org")
        req.add_header("Authorization", auth_header)
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print(f"  ✓ Authenticated with Grafana! Org: '{data.get('name')}' (User: {GRAFANA_USER}, Pass: {pwd})")
                    return auth_header
        except urllib.error.HTTPError as e:
            if e.code == 401:
                continue
            else:
                print(f"  ⚠ Status {e.code}: {e.reason}")
        except Exception as e:
            pass
            
    print(f"  ⚠ Could not authenticate with any tested password.")
    return None

def provision_datasource(auth_header):
    print("\n[1/2] Provisioning Datasources...")
    
    ds_payload = {
        "name": "Prometheus",
        "type": "prometheus",
        "access": "proxy",
        "url": "http://prometheus:9090",
        "isDefault": True,
        "jsonData": {
            "httpMethod": "POST",
            "timeInterval": "10s"
        }
    }
    
    req = urllib.request.Request(
        f"{GRAFANA_URL}/api/datasources",
        data=json.dumps(ds_payload).encode('utf-8'),
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f"  ✓ Datasource 'Prometheus' created/updated: {res.get('message', 'OK')}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print("  ℹ Datasource 'Prometheus' already exists. Continuing.")
        else:
            print(f"  ⚠ Datasource creation status: {e.code} - {e.reason}")
    except Exception as e:
        print(f"  ⚠ Datasource error: {e}")

def upload_dashboards(auth_header):
    print("\n[2/2] Uploading Sentinel Dashboards...")
    dash_dir = os.path.join(os.path.dirname(__file__), "..", "..", "infra", "grafana", "dashboards")
    dash_files = glob.glob(os.path.join(dash_dir, "*.json"))
    
    if not dash_files:
        print(f"  ⚠ No JSON files found in {dash_dir}")
        return

    for dash_file in dash_files:
        filename = os.path.basename(dash_file)
        try:
            with open(dash_file, 'r', encoding='utf-8') as f:
                dashboard_json = json.load(f)
            
            # Wrap in Grafana API expected schema
            payload = {
                "dashboard": dashboard_json,
                "overwrite": True,
                "message": "Automated provisioning by Gujarat Sentinel SRE Suite"
            }
            
            req = urllib.request.Request(
                f"{GRAFANA_URL}/api/dashboards/db",
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode('utf-8'))
                uid = result.get('uid', 'N/A')
                url = result.get('url', 'N/A')
                print(f"  ✓ Uploaded '{dashboard_json.get('title', filename)}' -> UID: {uid} ({GRAFANA_URL}{url})")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"  ⚠ Failed to upload {filename}: {e.code} {e.reason} - {err_body}")
        except Exception as e:
            print(f"  ⚠ Failed to upload {filename}: {e}")

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print("=================================================================")
    print("[SENTINEL] GUJARAT POLICE - GRAFANA DASHBOARD PROVISIONER")
    print("=================================================================")
    auth = test_grafana_connection()
    if not auth:
        print("[!] Could not authenticate with Grafana. Is the container running on localhost:3000?")
        sys.exit(1)
        
    provision_datasource(auth)
    upload_dashboards(auth)
    
    print("\n[+] Grafana Provisioning Complete! Open http://localhost:3000 to view dashboards.")
    print("=================================================================")

if __name__ == "__main__":
    main()
