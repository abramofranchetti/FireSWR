import json
import math
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "json" / "inflazione_personale.json"
API_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    "prc_hicp_midx"
)
PARAMETERS = {
    "freq": "M",
    "unit": "I15",
    "geo": "IT",
    "sinceTimePeriod": "2016-01",
}


def fetch_dataset():
    url = API_URL + "?" + urllib.parse.urlencode(PARAMETERS)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "FireSWR-personal-inflation-data/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Impossibile scaricare il dataset Eurostat: {error}") from error


def main():
    dataset = fetch_dataset()
    dimensions = dataset.get("dimension", {})
    dimension_ids = dataset.get("id", [])
    dimension_sizes = dataset.get("size", [])

    if "coicop" not in dimension_ids or "time" not in dimension_ids:
        raise RuntimeError("Il dataset Eurostat non contiene le dimensioni COICOP e time.")

    coicop_dimension = dimensions["coicop"]["category"]
    time_dimension = dimensions["time"]["category"]
    coicop_indices = coicop_dimension["index"]
    time_indices = time_dimension["index"]
    coicop_labels = coicop_dimension.get("label", {})
    months = sorted(time_indices, key=time_indices.get)
    if len(months) < 2:
        raise RuntimeError("Il dataset Eurostat non contiene abbastanza mesi.")

    values = dataset.get("value", {})
    coicop_position = dimension_ids.index("coicop")
    time_position = dimension_ids.index("time")
    strides = [
        math.prod(dimension_sizes[position + 1 :])
        for position in range(len(dimension_sizes))
    ]

    available_codes = set()
    values_by_code = {}
    for code, category_index in coicop_indices.items():
        series = {}
        for month, time_index in time_indices.items():
            flat_index = category_index * strides[coicop_position]
            flat_index += time_index * strides[time_position]
            value = values.get(str(flat_index))
            if value is not None:
                series[month] = value
        if series:
            available_codes.add(code)
            values_by_code[code] = series

    # Keep only the most detailed available COICOP codes, avoiding double counting.
    latest_month = months[-1]
    leaf_codes = [
        code
        for code in available_codes
        if len(code) > 4
        and "_" not in code
        and latest_month in values_by_code[code]
        and not any(
            other.startswith(code) and len(other) > len(code)
            for other in available_codes
        )
    ]

    categories = []
    for code in sorted(leaf_codes):
        group_code = code[:4]
        categories.append(
            {
                "code": code,
                "name": coicop_labels.get(code, code),
                "group": coicop_labels.get(group_code, group_code),
                "values": values_by_code[code],
            }
        )

    if not categories:
        raise RuntimeError("Il dataset Eurostat non contiene abbastanza indici COICOP.")

    result = {
        "source": "Eurostat",
        "dataset": "prc_hicp_midx",
        "geo": "IT",
        "unit": PARAMETERS["unit"],
        "updated": dataset.get("updated", ""),
        "months": months,
        "categories": categories,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"Salvate {len(categories)} sottocategorie e {len(months)} mesi "
        f"in {OUTPUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
