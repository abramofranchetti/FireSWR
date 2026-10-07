import csv
import io
import json
import math
from datetime import date
from pathlib import Path

import requests


SERIES_URL = "https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "json" / "xeon_estr.json"


def download_latest_observation() -> dict[str, str | float]:
    response = requests.get(
        SERIES_URL,
        params={"format": "csvdata", "lastNObservations": "1"},
        timeout=30,
    )
    response.raise_for_status()

    observations = list(csv.DictReader(io.StringIO(response.text)))
    if len(observations) != 1:
        raise ValueError(f"Attesa una sola osservazione BCE, ricevute: {len(observations)}")

    observation = observations[0]
    observation_date = observation.get("TIME_PERIOD", "")
    rate_value = observation.get("OBS_VALUE", "")

    try:
        date.fromisoformat(observation_date)
        rate = float(rate_value)
    except ValueError as error:
        raise ValueError("Data o tasso €STR BCE non validi") from error

    if not math.isfinite(rate):
        raise ValueError("Il tasso €STR BCE non è un numero finito")

    return {"date": observation_date, "rate": rate}


def main() -> None:
    observation = download_latest_observation()
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(observation, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Salvata osservazione €STR del {observation['date']} in {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
