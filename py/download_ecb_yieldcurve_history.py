import argparse
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests


URL = "https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A+G_N_C.SV_C_YM.?lastNObservations=1"
NS_MESSAGE = "{http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message}"
NS_GENERIC = "{http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic}"
MATURITY_RE = re.compile(r"^(SR|IF|PY|PYS_NR)_(?:(\d+)Y)?(?:(\d+)M)?$")


def parse_xml(xml_bytes):
    root = ET.fromstring(xml_bytes)
    prepared = root.findtext(f".//{NS_MESSAGE}Prepared", "")
    observations = {}
    effective_dates = []

    for series in root.iter(f"{NS_GENERIC}Series"):
        values = {item.attrib.get("id"): item.attrib.get("value", "")
                  for item in series.iter(f"{NS_GENERIC}Value")}
        match = MATURITY_RE.match(values.get("DATA_TYPE_FM", ""))
        if not match:
            continue
        prefix = match.group(1)
        maturity = int(match.group(2) or 0) + int(match.group(3) or 0) / 12
        title = values.get("TITLE", "")
        rating = "AAA" if title.startswith("AAA") else "All Ratings"
        curve_type = {"SR": "spot", "IF": "forward", "PY": "par", "PYS_NR": "par"}[prefix]
        obs = next(series.iter(f"{NS_GENERIC}Obs"), None)
        if obs is None:
            continue
        date_node = obs.find(f"{NS_GENERIC}ObsDimension")
        value_node = obs.find(f"{NS_GENERIC}ObsValue")
        if date_node is None or value_node is None:
            continue
        try:
            numeric_value = float(value_node.attrib["value"])
        except (KeyError, ValueError):
            continue
        date = date_node.attrib.get("value")
        if date:
            effective_dates.append(date)
            observations.setdefault(date, {}).setdefault(rating, {}).setdefault(curve_type, []).append(
                {"maturity": maturity, "yield": numeric_value}
            )

    data_date = max(effective_dates) if effective_dates else prepared[:10]
    for date_data in observations.values():
        for rating_data in date_data.values():
            for curve in rating_data.values():
                curve.sort(key=lambda point: point["maturity"])
    return {"source": "European Central Bank yield curve data", "updated_at": prepared,
            "dates": {data_date: observations.get(data_date, {})}}, data_date


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Use an existing XML instead of downloading it")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    history_dir = args.root / "xml" / "history"
    json_path = args.root / "json" / "ecb_yieldcurve_history.json"
    history_dir.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)

    if args.input:
        xml_bytes = args.input.read_bytes()
    else:
        response = requests.get(URL, timeout=60)
        response.raise_for_status()
        xml_bytes = response.content
    parsed, data_date = parse_xml(xml_bytes)
    snapshot_path = history_dir / f"{data_date}.xml"
    snapshot_path.write_bytes(xml_bytes)

    history = json.loads(json_path.read_text(encoding="utf-8")) if json_path.exists() else {
        "source": parsed["source"], "updated_at": parsed["updated_at"], "dates": {}
    }
    history["dates"].update(parsed["dates"])
    history["last_collected_at"] = datetime.now(timezone.utc).isoformat()
    json_path.write_text(json.dumps(history, separators=(",", ":")), encoding="utf-8")
    print(f"Salvato dato BCE {data_date}: {snapshot_path}")


if __name__ == "__main__":
    main()