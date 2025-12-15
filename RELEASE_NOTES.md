# FlashDoc 2.2.0 - Release Notes

## Neu

### Category Shortcuts
Das Prefix-System wurde durch ein einfacheres "Category Shortcuts"-System ersetzt:
- Erstelle bis zu 5 Schnellspeicher-Kombis: Kategorie + Format
- Beispiel: "Design" + ".md" = speichert als `Design_save_2025-12-15.md`
- Shortcuts erscheinen oben im Floating-Menü mit einem Klick erreichbar
- Einfachere Einstellungsseite ohne komplizierte Prefix-Auswahl

## Verbesserungen

### Vereinfachte Bedienung
- Direkter One-Click-Save mit vordefinierten Kategorien
- Kein zweistufiger Dialog mehr (Format -> Prefix)
- Saubere Trennung zwischen Shortcuts und Standard-Formaten im Menü

## Bugfixes
- Auto-Menü (3-Sekunden-Timer) entfernt - verursachte Zuverlässigkeitsprobleme
- Prefix-Tracking entfernt - vereinfachtes System braucht keine Nutzungsstatistik

## Technische Hinweise
- Keine neuen Berechtigungen erforderlich
- Alte `filePrefixes` Einstellungen werden nicht migriert - bitte neu erstellen als Shortcuts
- Neue Storage-Key: `categoryShortcuts` (Array mit {id, name, format})

---

# FlashDoc 2.1.0 - Previous Release

## Neu
- **Word-Dokumente (DOCX)**: Echte .docx Dateien erstellen
- **FlashDoc-Ball**: Draggbares Icon mit Pin-Funktion
- **Verbesserte Button-Positionierung**: +40px Offset, Viewport-Clamping
