#!/usr/bin/env python3
"""
Amazon -> eBay Arbitrage-Finder

Vergleicht Amazon.de-Einkaufspreise mit realen eBay.de-Verkaufspreisen,
rechnet eBay-Gebühren und Versand gegen und sortiert nach Netto-Marge.

Drei Betriebsmodi:

1. Offline-Modus (keine API-Keys nötig):
   Du pflegst Amazon-Preis und eBay-Zielpreis selbst in der Watchlist-CSV.
   Das Tool rechnet Gebühren, Marge und Break-Even aus.

       python arbitrage_finder.py --watchlist watchlist.csv

2. Keepa-Modus (KEEPA_API_KEY gesetzt):
   Amazon-Preise werden live per ASIN über die Keepa-API geholt.

3. Voll-Modus (zusätzlich EBAY_CLIENT_ID / EBAY_CLIENT_SECRET gesetzt):
   Aktive eBay.de-Angebote werden über die offizielle eBay Browse API
   gesucht (per EAN oder Suchbegriff) und der Median-Preis als
   realistischer Verkaufspreis angesetzt.

Ausgabe: sortierte Tabelle auf der Konsole + results.csv
"""

import argparse
import base64
import csv
import json
import os
import statistics
import sys
import urllib.parse
import urllib.request

KEEPA_API_KEY = os.environ.get("KEEPA_API_KEY", "")
EBAY_CLIENT_ID = os.environ.get("EBAY_CLIENT_ID", "")
EBAY_CLIENT_SECRET = os.environ.get("EBAY_CLIENT_SECRET", "")

# eBay.de Standardgebühren für gewerbliche Verkäufer (Stand 2026, ohne Shop-Abo).
# Je nach Kategorie 3-12 %: mit --fee-percent anpassen.
DEFAULT_FEE_PERCENT = 11.0
DEFAULT_FEE_FIXED = 0.35  # Fixanteil pro Bestellung in EUR


def http_get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------- Keepa (Amazon)

def keepa_current_price(asin):
    """Aktueller Amazon.de-Neupreis (EUR) über die Keepa-API, None wenn unbekannt."""
    url = (
        "https://api.keepa.com/product?key={key}&domain=3&stats=1&asin={asin}"
        .format(key=urllib.parse.quote(KEEPA_API_KEY), asin=urllib.parse.quote(asin))
    )
    data = http_get_json(url)
    products = data.get("products") or []
    if not products:
        return None
    current = (products[0].get("stats") or {}).get("current") or []
    # Index 0 = Amazon-Preis, Index 1 = günstigster Neupreis (Marketplace); Cent, -1 = n/a
    for idx in (0, 1):
        if len(current) > idx and current[idx] not in (None, -1):
            return current[idx] / 100.0
    return None


# ---------------------------------------------------------------- eBay Browse API

def ebay_access_token():
    creds = base64.b64encode(
        f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode()
    ).decode()
    req = urllib.request.Request(
        "https://api.ebay.com/identity/v1/oauth2/token",
        data=urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope",
        }).encode(),
        headers={
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())["access_token"]


def ebay_median_price(token, query=None, ean=None, limit=25):
    """Median-Preis aktiver eBay.de-Festpreisangebote (EUR), None wenn keine Treffer."""
    params = {
        "limit": str(limit),
        "filter": "buyingOptions:{FIXED_PRICE},itemLocationCountry:DE",
    }
    if ean:
        params["gtin"] = ean
    elif query:
        params["q"] = query
    else:
        return None
    url = "https://api.ebay.com/buy/browse/v1/item_summary/search?" + urllib.parse.urlencode(params)
    data = http_get_json(url, headers={
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_DE",
    })
    prices = []
    for item in data.get("itemSummaries", []):
        price = item.get("price", {})
        if price.get("currency") == "EUR":
            try:
                prices.append(float(price["value"]))
            except (KeyError, ValueError):
                pass
    return statistics.median(prices) if prices else None


# ---------------------------------------------------------------- Kalkulation

def calculate(amazon_price, ebay_price, shipping_cost, fee_percent, fee_fixed):
    """Netto-Marge nach eBay-Gebühren und eigenem Versand."""
    fees = ebay_price * fee_percent / 100.0 + fee_fixed
    margin = ebay_price - fees - shipping_cost - amazon_price
    margin_pct = margin / amazon_price * 100.0 if amazon_price else 0.0
    # eBay-Preis, ab dem die Marge >= 0 ist:
    break_even = (amazon_price + shipping_cost + fee_fixed) / (1 - fee_percent / 100.0)
    return round(fees, 2), round(margin, 2), round(margin_pct, 1), round(break_even, 2)


def load_watchlist(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return [row for row in csv.DictReader(fh) if any(v.strip() for v in row.values())]


def main():
    parser = argparse.ArgumentParser(description="Amazon -> eBay Arbitrage-Finder")
    parser.add_argument("--watchlist", default="watchlist.csv",
                        help="CSV mit Spalten: name,asin,ean,query,amazon_price,ebay_price,shipping")
    parser.add_argument("--fee-percent", type=float, default=DEFAULT_FEE_PERCENT,
                        help="eBay-Verkaufsprovision in %% (Standard: 11)")
    parser.add_argument("--fee-fixed", type=float, default=DEFAULT_FEE_FIXED,
                        help="eBay-Fixgebühr pro Bestellung in EUR (Standard: 0.35)")
    parser.add_argument("--min-margin", type=float, default=0.0,
                        help="Nur Artikel mit mindestens dieser Marge (EUR) ausgeben")
    parser.add_argument("--out", default="results.csv", help="Pfad der Ergebnis-CSV")
    args = parser.parse_args()

    rows = load_watchlist(args.watchlist)
    if not rows:
        sys.exit(f"Watchlist {args.watchlist} ist leer.")

    token = None
    if EBAY_CLIENT_ID and EBAY_CLIENT_SECRET:
        token = ebay_access_token()
        print("eBay Browse API aktiv (Live-Preise).")
    if KEEPA_API_KEY:
        print("Keepa API aktiv (Live-Amazon-Preise).")

    results = []
    for row in rows:
        name = row.get("name", "").strip() or row.get("asin", "").strip()
        asin = row.get("asin", "").strip()
        ean = row.get("ean", "").strip()
        query = row.get("query", "").strip() or name
        shipping = float(row.get("shipping") or 0)

        amazon_price = float(row["amazon_price"]) if row.get("amazon_price", "").strip() else None
        if amazon_price is None and KEEPA_API_KEY and asin:
            try:
                amazon_price = keepa_current_price(asin)
            except Exception as exc:
                print(f"  [warn] Keepa-Abruf für {asin} fehlgeschlagen: {exc}")
        if amazon_price is None:
            print(f"  [skip] {name}: kein Amazon-Preis (weder CSV noch Keepa).")
            continue

        ebay_price = float(row["ebay_price"]) if row.get("ebay_price", "").strip() else None
        if ebay_price is None and token:
            try:
                ebay_price = ebay_median_price(token, query=query, ean=ean or None)
            except Exception as exc:
                print(f"  [warn] eBay-Abruf für {name} fehlgeschlagen: {exc}")
        if ebay_price is None:
            print(f"  [skip] {name}: kein eBay-Preis (weder CSV noch API).")
            continue

        fees, margin, margin_pct, break_even = calculate(
            amazon_price, ebay_price, shipping, args.fee_percent, args.fee_fixed
        )
        if margin >= args.min_margin:
            results.append({
                "name": name, "asin": asin,
                "amazon_price": round(amazon_price, 2),
                "ebay_price": round(ebay_price, 2),
                "shipping": shipping, "ebay_fees": fees,
                "margin_eur": margin, "margin_pct": margin_pct,
                "break_even_ebay_price": break_even,
            })

    results.sort(key=lambda r: r["margin_eur"], reverse=True)

    if not results:
        sys.exit("Keine Artikel über der Mindestmarge gefunden.")

    header = f"{'Artikel':<38}{'Amazon €':>10}{'eBay €':>9}{'Gebühr €':>10}{'Marge €':>9}{'Marge %':>9}{'Break-Even':>12}"
    print("\n" + header)
    print("-" * len(header))
    for r in results:
        print(f"{r['name'][:36]:<38}{r['amazon_price']:>10.2f}{r['ebay_price']:>9.2f}"
              f"{r['ebay_fees']:>10.2f}{r['margin_eur']:>9.2f}{r['margin_pct']:>8.1f}%"
              f"{r['break_even_ebay_price']:>12.2f}")

    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)
    print(f"\n{len(results)} Artikel gespeichert in {args.out}")


if __name__ == "__main__":
    main()
