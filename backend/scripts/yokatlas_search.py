#!/usr/bin/env python3
import json
import sys

from yokatlas_py import search_lisans_programs


def main() -> int:
    query = (sys.argv[1] or "").strip() if len(sys.argv) >= 2 else ""
    filters = {}
    if len(sys.argv) >= 3:
        try:
            raw = json.loads(sys.argv[2] or "{}")
            if isinstance(raw, dict):
                filters = raw
        except Exception:
            filters = {}

    if len(query) < 2 and not filters:
        print("[]")
        return 0

    try:
        params = {}
        if len(query) >= 2:
            params["program"] = query
        if filters.get("sehir"):
            params["sehir"] = filters["sehir"]
        if filters.get("universite_turu"):
            params["universite_turu"] = filters["universite_turu"]
        if filters.get("puan_turu"):
            params["puan_turu"] = filters["puan_turu"]

        results = search_lisans_programs(params)
        normalized = []
        for item in results[:120]:
            normalized.append(
                {
                    "yop_kodu": item.get("yop_kodu"),
                    "uni_adi": item.get("uni_adi"),
                    "sehir_adi": item.get("sehir_adi"),
                    "universite_turu": item.get("universite_turu"),
                    "program_adi": item.get("program_adi"),
                    "taban": item.get("taban") or {},
                    "tbs": item.get("tbs") or {},
                }
            )
        print(json.dumps(normalized, ensure_ascii=False))
        return 0
    except Exception:
        print("[]")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
