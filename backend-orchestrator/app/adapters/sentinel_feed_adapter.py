"""Adapter for official Sentinel sandbox camera feeds and stream catalogue."""

import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("sentinel.adapter.feed")

# 50 Gujarat Core Police Checkpoints & Camera Geographies
GUJARAT_CAMERA_GEOGRAPHIES = [
    # Ahmedabad City (West & Central)
    {"id": "1", "code": "CAM-AHM-01", "name": "SG Highway — Prahladnagar Junction", "loc": "SG Highway, Ahmedabad", "dist": "Ahmedabad City", "stn": "Navrangpura PS", "lat": 23.0125, "lng": 72.5085, "type": "ANPR", "dept": "POLICE"},
    {"id": "2", "code": "CAM-AHM-02", "name": "Iskcon Crossroad Flyover North", "loc": "SG Highway & Iskcon Crossroad", "dist": "Ahmedabad City", "stn": "Satellite PS", "lat": 23.0285, "lng": 72.5070, "type": "PTZ", "dept": "POLICE"},
    {"id": "3", "code": "CAM-AHM-03", "name": "Ashram Road — Income Tax Circle", "loc": "Ashram Road, Central Ahmedabad", "dist": "Ahmedabad City", "stn": "Navrangpura PS", "lat": 23.0410, "lng": 72.5700, "type": "BULLET", "dept": "POLICE"},
    {"id": "4", "code": "CAM-AHM-04", "name": "SP Ring Road — Bopal Junction", "loc": "SP Ring Road, Bopal Circle", "dist": "Ahmedabad City", "stn": "Bopal PS", "lat": 23.0340, "lng": 72.4620, "type": "ANPR", "dept": "POLICE"},
    {"id": "5", "code": "CAM-AHM-05", "name": "Sindhu Bhavan Road — Pakwan Cross", "loc": "Sindhu Bhavan Rd & Bodakdev", "dist": "Ahmedabad City", "stn": "Bodakdev PS", "lat": 23.0425, "lng": 72.5180, "type": "BULLET", "dept": "POLICE"},
    {"id": "6", "code": "CAM-AHM-06", "name": "Kalupur Railway Station West Gate", "loc": "Kalupur Railway Station Approach", "dist": "Ahmedabad City", "stn": "Kalupur PS", "lat": 23.0260, "lng": 72.6010, "type": "PTZ", "dept": "POLICE"},
    {"id": "7", "code": "CAM-AHM-07", "name": "Gita Mandir Central Bus Terminus", "loc": "Gita Mandir ST Stand", "dist": "Ahmedabad City", "stn": "Kagadapith PS", "lat": 23.0135, "lng": 72.5890, "type": "BULLET", "dept": "TRANSPORT_RTO"},
    {"id": "8", "code": "CAM-AHM-08", "name": "Narol — Vatva Industrial Crossroad", "loc": "Narol Circle NH 48", "dist": "Ahmedabad City", "stn": "Narol PS", "lat": 22.9730, "lng": 72.6050, "type": "ANPR", "dept": "POLICE"},
    {"id": "9", "code": "CAM-AHM-09", "name": "Airport Circle — Domestic Terminal Entry", "loc": "Sardar Vallabhbhai Patel Intl Airport", "dist": "Ahmedabad City", "stn": "Airport PS", "lat": 23.0725, "lng": 72.6280, "type": "ANPR", "dept": "BORDER_SECURITY"},

    # Gandhinagar (State Capital & Government Secretariat)
    {"id": "10", "code": "CAM-GND-01", "name": "CH-0 Circle — Vidhan Sabha Secretariat", "loc": "CH-0 Circle & Swarnim Sankul", "dist": "Gandhinagar", "stn": "Sector 7 PS", "lat": 23.2185, "lng": 72.6640, "type": "PTZ", "dept": "POLICE"},
    {"id": "11", "code": "CAM-GND-02", "name": "GH-5 Circle — Mahatma Mandir Complex", "loc": "Sector 13, Gandhinagar", "dist": "Gandhinagar", "stn": "Sector 21 PS", "lat": 23.2260, "lng": 72.6450, "type": "BULLET", "dept": "POLICE"},
    {"id": "12", "code": "CAM-GND-03", "name": "Infocity — IT Corridor Gate 1", "loc": "Infocity Knowledge Corridor", "dist": "Gandhinagar", "stn": "Infocity PS", "lat": 23.1895, "lng": 72.6320, "type": "ANPR", "dept": "POLICE"},
    {"id": "13", "code": "CAM-GND-04", "name": "State Cyber Command Headquarters", "loc": "Police Cyber Crime Directorate", "dist": "Gandhinagar", "stn": "Cyber Crime PS", "lat": 23.2350, "lng": 72.6580, "type": "PTZ", "dept": "POLICE"},
    {"id": "14", "code": "CAM-GND-05", "name": "GIFT City — Main Entry Bridge East", "loc": "GIFT City Access Highway", "dist": "Gandhinagar", "stn": "Dholeshwar PS", "lat": 23.1600, "lng": 72.6840, "type": "ANPR", "dept": "POLICE"},

    # Surat City & Diamond Corridor
    {"id": "15", "code": "CAM-SUR-01", "name": "Ring Road — Textile Market Checkpoint", "loc": "Surat Ring Road & Sahara Darwaja", "dist": "Surat City", "stn": "Salabatpura PS", "lat": 21.1925, "lng": 72.8450, "type": "ANPR", "dept": "POLICE"},
    {"id": "16", "code": "CAM-SUR-02", "name": "Varachha — Diamond Bourse Main Gate", "loc": "Varachha Main Road", "dist": "Surat City", "stn": "Varachha PS", "lat": 21.2210, "lng": 72.8710, "type": "BULLET", "dept": "POLICE"},
    {"id": "17", "code": "CAM-SUR-03", "name": "Dumas Road — Airport Highway Flyover", "loc": "Dumas Coastal Highway", "dist": "Surat City", "stn": "Dumas PS", "lat": 21.1430, "lng": 72.7480, "type": "ANPR", "dept": "TRANSPORT_RTO"},
    {"id": "18", "code": "CAM-SUR-04", "name": "Surat Central Station — Platform 1 Approach", "loc": "Surat Railway Station Road", "dist": "Surat City", "stn": "Mahidharpura PS", "lat": 21.2050, "lng": 72.8410, "type": "PTZ", "dept": "POLICE"},
    {"id": "19", "code": "CAM-SUR-05", "name": "Hazira Port — Heavy Commercial Transit", "loc": "Hazira Port Industrial Corridor", "dist": "Surat City", "stn": "Hazira PS", "lat": 21.0960, "lng": 72.6320, "type": "ANPR", "dept": "TRANSPORT_RTO"},

    # Vadodara City
    {"id": "20", "code": "CAM-VAD-01", "name": "Alkapuri — Railway Underbridge North", "loc": "RC Dutt Road, Alkapuri", "dist": "Vadodara City", "stn": "Sayajigunj PS", "lat": 22.3120, "lng": 73.1750, "type": "BULLET", "dept": "POLICE"},
    {"id": "21", "code": "CAM-VAD-02", "name": "Sayajigunj — Kalaghoda Circle", "loc": "Sayajigunj Central Junction", "dist": "Vadodara City", "stn": "Sayajigunj PS", "lat": 22.3080, "lng": 73.1890, "type": "PTZ", "dept": "POLICE"},
    {"id": "22", "code": "CAM-VAD-03", "name": "NH-48 Express Toll Plaza — Vadodara Entry", "loc": "National Highway 48 Toll", "dist": "Vadodara City", "stn": "Varnama PS", "lat": 22.2150, "lng": 73.2350, "type": "ANPR", "dept": "TRANSPORT_RTO"},
    {"id": "23", "code": "CAM-VAD-04", "name": "Manjalpur — Commercial Ring Road", "loc": "Manjalpur Main Crossroad", "dist": "Vadodara City", "stn": "Manjalpur PS", "lat": 22.2740, "lng": 73.1980, "type": "BULLET", "dept": "POLICE"},

    # Rajkot City
    {"id": "24", "code": "CAM-RAJ-01", "name": "Kalawad Road — KKV Hall Flyover", "loc": "Kalawad Road, Rajkot", "dist": "Rajkot City", "stn": "Malaviyanagar PS", "lat": 22.2850, "lng": 70.7680, "type": "ANPR", "dept": "POLICE"},
    {"id": "25", "code": "CAM-RAJ-02", "name": "150 Feet Ring Road — Madhapar Chowk", "loc": "Madhapar Crossroad NH 27", "dist": "Rajkot City", "stn": "Gandhigram PS", "lat": 22.3210, "lng": 70.7850, "type": "PTZ", "dept": "POLICE"},
    {"id": "26", "code": "CAM-RAJ-03", "name": "Yagnik Road — Imperial Heights Junction", "loc": "Dr Yagnik Road", "dist": "Rajkot City", "stn": "A Division PS", "lat": 22.2960, "lng": 70.7960, "type": "BULLET", "dept": "POLICE"},

    # Junagadh & Saurashtra Coastal Corridor
    {"id": "27", "code": "CAM-JUN-01", "name": "Girnar Taleti — Pilgrim Transit Gate", "loc": "Girnar Foothills Entry", "dist": "Junagadh", "stn": "Bhesan PS", "lat": 21.5280, "lng": 70.4950, "type": "ANPR", "dept": "FOREST_WILDLIFE"},
    {"id": "28", "code": "CAM-JUN-02", "name": "Zanzarda Road — Western Bypass Junction", "loc": "Zanzarda Crossroad Bypass", "dist": "Junagadh", "stn": "C Division PS", "lat": 21.5120, "lng": 70.4480, "type": "PTZ", "dept": "POLICE"},
    {"id": "29", "code": "CAM-JUN-03", "name": "Moti Baug — Agriculture University Circle", "loc": "Moti Baug Circle", "dist": "Junagadh", "stn": "A Division PS", "lat": 21.5010, "lng": 70.4610, "type": "BULLET", "dept": "POLICE"},
    {"id": "30", "code": "CAM-JUN-04", "name": "Veraval Highway Coastal Toll Checkpoint", "loc": "Somnath Highway Checkpoint", "dist": "Junagadh", "stn": "Vanthali PS", "lat": 21.4350, "lng": 70.3620, "type": "ANPR", "dept": "TRANSPORT_RTO"},

    # Navsari & South Gujarat Links (31-35)
    {"id": "31", "code": "CAM-NAV-01", "name": "Lunsikui — Main Market Crossroad", "loc": "Lunsikui Road", "dist": "Navsari", "stn": "Navsari Town PS", "lat": 20.9520, "lng": 72.9280, "type": "BULLET", "dept": "POLICE"},
    {"id": "32", "code": "CAM-NAV-02", "name": "NH-48 Navsari Bypass Interchange", "loc": "National Highway 48 Bypass", "dist": "Navsari", "stn": "Navsari Rural PS", "lat": 20.9380, "lng": 72.9510, "type": "ANPR", "dept": "TRANSPORT_RTO"},
    {"id": "33", "code": "CAM-NAV-03", "name": "Dandi Coastal Highway Heritage Checkpoint", "loc": "Dandi Memorial Road", "dist": "Navsari", "stn": "Jalalpore PS", "lat": 20.8920, "lng": 72.8050, "type": "PTZ", "dept": "BORDER_SECURITY"},
    {"id": "34", "code": "CAM-NAV-04", "name": "Jalalpore — Station Crossroad", "loc": "Jalalpore Main Market", "dist": "Navsari", "stn": "Jalalpore PS", "lat": 20.9410, "lng": 72.9120, "type": "BULLET", "dept": "POLICE"},
    {"id": "35", "code": "CAM-NAV-05", "name": "Gandevi — State Highway 6 Interlink", "loc": "State Highway 6", "dist": "Navsari", "stn": "Gandevi PS", "lat": 20.8150, "lng": 72.9820, "type": "ANPR", "dept": "POLICE"},

    # Kutch & Border Security (36-40)
    {"id": "36", "code": "CAM-KUT-01", "name": "Bhuj — Jubilee Ground Central Circle", "loc": "Jubilee Ground, Bhuj", "dist": "Kutch", "stn": "Bhuj City PS", "lat": 23.2420, "lng": 69.6670, "type": "PTZ", "dept": "POLICE"},
    {"id": "37", "code": "CAM-KUT-02", "name": "Gandhidham — Kandla Port Gate 2", "loc": "Kandla Port Access Highway", "dist": "Kutch", "stn": "Kandla PS", "lat": 23.0180, "lng": 70.1850, "type": "ANPR", "dept": "BORDER_SECURITY"},
    {"id": "38", "code": "CAM-KUT-03", "name": "Mundra Port Special Economic Zone Entrance", "loc": "Mundra Port Highway", "dist": "Kutch", "stn": "Mundra PS", "lat": 22.8420, "lng": 69.7150, "type": "ANPR", "dept": "TRANSPORT_RTO"},
    {"id": "39", "code": "CAM-KUT-04", "name": "Khavda — Rann of Kutch Border Checkpost", "loc": "Khavda North Border Road", "dist": "Kutch", "stn": "Khavda PS", "lat": 23.8510, "lng": 69.7280, "type": "PTZ", "dept": "BORDER_SECURITY"},
    {"id": "40", "code": "CAM-KUT-05", "name": "Samakhiali Toll Plaza — Kutch Gateway", "loc": "NH 41 Samakhiali Circle", "dist": "Kutch", "stn": "Samakhiali PS", "lat": 23.3120, "lng": 70.5250, "type": "ANPR", "dept": "POLICE"},

    # Bhavnagar, Mehsana, Jamnagar, Bharuch, Anand & Highways (41-50)
    {"id": "41", "code": "CAM-BHV-01", "name": "Bhavnagar — Ghogha Circle Checkpoint", "loc": "Ghogha Circle NH 51", "dist": "Bhavnagar", "stn": "B Division PS", "lat": 21.7640, "lng": 72.1520, "type": "ANPR", "dept": "POLICE"},
    {"id": "42", "code": "CAM-BHV-02", "name": "Alang Ship Breaking Yard Access Highway", "loc": "Alang Coastal Highway", "dist": "Bhavnagar", "stn": "Alang PS", "lat": 21.4120, "lng": 72.1950, "type": "PTZ", "dept": "BORDER_SECURITY"},
    {"id": "43", "code": "CAM-MEH-01", "name": "Mehsana — Modhera Crossroad NH 68", "loc": "Modhera Highway Junction", "dist": "Mehsana", "stn": "Mehsana City PS", "lat": 23.5980, "lng": 72.3920, "type": "ANPR", "dept": "POLICE"},
    {"id": "44", "code": "CAM-JAM-01", "name": "Jamnagar — Digjam Circle Industrial Gate", "loc": "Digjam Circle & Refinery Road", "dist": "Jamnagar", "stn": "C Division PS", "lat": 22.4710, "lng": 70.0650, "type": "ANPR", "dept": "POLICE"},
    {"id": "45", "code": "CAM-BHR-01", "name": "Bharuch — Golden Bridge Narmada Entry", "loc": "Narmada River Golden Bridge", "dist": "Bharuch", "stn": "Bharuch City PS", "lat": 21.7050, "lng": 72.9850, "type": "PTZ", "dept": "POLICE"},
    {"id": "46", "code": "CAM-BHR-02", "name": "Dahej Petroleum Corridor Highway Checkpost", "loc": "Dahej PCPIR Highway", "dist": "Bharuch", "stn": "Dahej PS", "lat": 21.7180, "lng": 72.5850, "type": "ANPR", "dept": "TRANSPORT_RTO"},
    {"id": "47", "code": "CAM-AND-01", "name": "Anand — Express Highway Grid Intersection", "loc": "Ahmedabad-Vadodara Expressway Toll", "dist": "Anand", "stn": "Anand Rural PS", "lat": 22.5640, "lng": 72.9280, "type": "ANPR", "dept": "POLICE"},
    {"id": "48", "code": "CAM-AND-02", "name": "Amul Dairy Central Dairy Plant Road", "loc": "Amul Dairy Road", "dist": "Anand", "stn": "Anand Town PS", "lat": 22.5530, "lng": 72.9510, "type": "BULLET", "dept": "POLICE"},
    {"id": "49", "code": "CAM-PAT-01", "name": "Patan — Rani Ki Vav World Heritage Access", "loc": "Rani Ki Vav Road", "dist": "Patan", "stn": "Patan City PS", "lat": 23.8580, "lng": 72.1010, "type": "PTZ", "dept": "POLICE"},
    {"id": "50", "code": "CAM-STH-01", "name": "Statue of Unity — Narmada Dam Perimeter Gate", "loc": "Ekta Nagar & Kevadia Gate", "dist": "Narmada", "stn": "Kevadia PS", "lat": 21.8380, "lng": 73.7190, "type": "ANPR", "dept": "POLICE"},
]


class SentinelFeedAdapter:
    """
    Parses and builds streaming endpoints for official Sentinel sandbox camera feeds.
    Strictly implements:
    1. RTSP over TCP (protocols=tcp)
    2. WebRTC (WHEP)
    3. HLS (.m3u8)
    """

    @staticmethod
    def get_rtsp_url(stream_id: str) -> str:
        return f"{settings.SENTINEL_RTSP_BASE}/{stream_id}"

    @staticmethod
    def get_webrtc_url(stream_id: str) -> str:
        return f"{settings.SENTINEL_WHEP_BASE}/{stream_id}/whep"

    @staticmethod
    def get_hls_url(stream_id: str) -> str:
        return f"{settings.SENTINEL_HLS_BASE}/{stream_id}/index.m3u8"

    @classmethod
    def get_preconfigured_50_cameras(cls) -> List[Dict[str, Any]]:
        """Returns the full 50-camera deployment inventory for Gujarat Police Sentinel platform."""
        result = []
        for c in GUJARAT_CAMERA_GEOGRAPHIES:
            stream_id = c["id"]
            result.append({
                "id": stream_id,
                "stream_id": stream_id,
                "camera_code": c["code"],
                "name": c["name"],
                "location_name": c["loc"],
                "district": c["dist"],
                "station": c["stn"],
                "latitude": c["lat"],
                "longitude": c["lng"],
                "camera_type": c["type"],
                "vms_vendor": "CORP8_LIVE_GATEWAY",
                "rtsp_url": cls.get_rtsp_url(stream_id),
                "webrtc_url": cls.get_webrtc_url(stream_id),
                "hls_url": cls.get_hls_url(stream_id),
                "codec": "h264",
                "fps": 25,
                "resolution": "1920x1080",
                "bitrate_kbps": 4000,
                "status": "ONLINE",
                "is_live": True,
                "department_id": c["dept"],
            })
        return result


sentinel_feed_adapter = SentinelFeedAdapter()
