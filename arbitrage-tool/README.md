# Amazon → eBay Arbitrage-Finder

Ein CLI-Tool, das Amazon.de-Einkaufspreise mit realen eBay.de-Verkaufspreisen
vergleicht, eBay-Gebühren und Versand gegenrechnet und dir eine nach
Netto-Marge sortierte Liste ausgibt.

## Wichtig, bevor du startest (Regeln & Recht)

**eBay verbietet klassisches Amazon-Dropshipping.** Laut eBay-Grundsatz zum
Streckengeschäft darfst du *nicht* einen Artikel bei eBay einstellen und ihn
nach dem Verkauf bei Amazon (oder einem anderen Marktplatz/Einzelhändler)
bestellen und direkt an den Käufer schicken lassen. Konten werden dafür
regelmäßig eingeschränkt oder gesperrt.

**Erlaubt ist Retail-Arbitrage mit eigenem Lager:** Du kaufst die Ware bei
Amazon ein, nimmst sie selbst in Empfang und versendest sie selbst (neutral
verpackt, eigene Rechnung). Genau für dieses Modell ist dieses Tool gedacht.
Außerdem zu beachten:

- **Amazon-AGB:** Prime-Versandvorteile dürfen nicht für Weiterverkauf genutzt
  werden; Wiederverkauf in großem Stil kann auch das Amazon-Kundenkonto gefährden.
- **Gewerbe & Steuern (DE):** Regelmäßiger Weiterverkauf mit Gewinnabsicht ist
  gewerblich → Gewerbeanmeldung, Umsatzsteuer (ggf. Kleinunternehmerregelung),
  Einkommensteuer. eBay meldet Verkäuferumsätze ans Finanzamt (DAC7).
- **Pflichten als gewerblicher Verkäufer:** Impressum, Widerrufsrecht,
  Rücknahme, ggf. Verpackungsgesetz (LUCID) und Produktsicherheit (GPSR).
- **Markenware:** Der Weiterverkauf regulär gekaufter Neuware ist in der EU
  grundsätzlich erlaubt (Erschöpfungsgrundsatz), aber nutze niemals fremde
  Produktfotos ohne Rechte daran.

## Welche Artikel eignen sich?

Es gibt keine dauerhaft gültige "beste Artikel"-Liste — Margen entstehen durch
temporäre Preisunterschiede und verschwinden schnell wieder. Kategorien, in
denen sich erfahrungsgemäß am häufigsten Spannen finden lassen:

| Kategorie | Warum es funktioniert |
|---|---|
| LEGO (v. a. EOL-Sets kurz vor Auslauf) | Amazon rotiert Rabatte, eBay-Preise steigen nach Auslauf |
| Blitzangebote / Warehouse Deals | Kurzfristige Amazon-Rabatte von 20–50 % |
| Marken-Elektronik-Zubehör (Hue, Tado, Anker, Logitech) | Häufige Amazon-Aktionen, stabile eBay-Nachfrage |
| Spielzeug zu Saisonspitzen (Q4) | Amazon senkt früh, eBay-Preise ziehen vor Weihnachten an |
| Drogerie-/Parfüm-Sets in Aktionen | Bundles sind auf eBay schwer vergleichbar |
| Auslaufmodelle (Konsolen-Bundles, Küchengeräte) | Nach Abverkauf bei Amazon steigen Gebrauchtmarkt-Preise |
| Ersatzteile & Zubehör (Staubsauger, Kaffeemaschinen) | Geringer Preisvergleich durch Käufer, hohe Marge in % |

Praktisches Vorgehen: Kandidaten aus Amazon-Blitzangeboten oder Keepa-Deals
(keepa.com → "Deals", Filter: Preisrückgang ≥ 30 %) in die `watchlist.csv`
eintragen und das Tool rechnen lassen. Faustregel: Unter **15 € Marge und
30 % Aufschlag** lohnt sich ein Artikel nach Retouren und Zeitaufwand selten.

## Installation

Nur Python 3.8+ nötig, keine externen Pakete (nutzt nur die Standardbibliothek).

```bash
cd arbitrage-tool
cp watchlist.example.csv watchlist.csv
python arbitrage_finder.py --watchlist watchlist.csv
```

## Die drei Modi

### 1. Offline-Modus (sofort nutzbar, keine Keys)

Trage `amazon_price`, `ebay_price` und `shipping` selbst in die CSV ein.
Das Tool berechnet eBay-Gebühren, Netto-Marge und den Break-Even-Preis.

### 2. Live-Amazon-Preise über Keepa

Keepa-API-Key holen (keepa.com/#!api, kostenpflichtiges Abo ab ~19 €/Monat,
lohnt sich erst bei regelmäßiger Nutzung):

```bash
export KEEPA_API_KEY="dein-key"
```

Zeilen mit ausgefülltem `asin` und leerem `amazon_price` werden dann live geholt.

### 3. Live-eBay-Preise über die offizielle eBay Browse API

Kostenlosen Developer-Account anlegen (developer.ebay.com), App erstellen,
Production-Keys nehmen:

```bash
export EBAY_CLIENT_ID="dein-app-id"
export EBAY_CLIENT_SECRET="dein-cert-id"
```

Zeilen mit leerem `ebay_price` werden dann per EAN (bevorzugt) oder
Suchbegriff (`query`) gesucht; angesetzt wird der **Median** aktiver
Festpreisangebote aus Deutschland — realistischer als der billigste Anbieter.

## Optionen

```
--fee-percent 11     eBay-Verkaufsprovision in % (Standard 11; je nach Kategorie 3–12 %)
--fee-fixed 0.35     Fixgebühr pro Bestellung in EUR
--min-margin 10      Nur Artikel mit mindestens 10 € Netto-Marge ausgeben
--out results.csv    Pfad der Ergebnis-CSV
```

## Beispielausgabe

```
Artikel                                 Amazon €   eBay €  Gebühr €  Marge €  Marge %  Break-Even
--------------------------------------------------------------------------------------------------
LEGO Technic 42151                         39.99    54.90      6.39     3.03     7.6%       51.50
```

Die Spalte **Break-Even** zeigt, ab welchem eBay-Verkaufspreis du nach
Gebühren und Versand bei ±0 liegst — alles darüber ist Marge. Kalkuliere
zusätzlich ~5–10 % für Retouren und Zahlungsausfälle ein.
