Brainstorm-Ergebnis
Faktisch korrekt sage ich, dass aus deiner Beschreibung klar ist:

Problem Statement
Markierten Text zu speichern kostet Zeit (Copy & Paste, Dateiname ausdenken, Ordner wählen). Für Devs, Data-Leute und Power-User ist das täglich nervig.

Ziel der Landingpage

FlashDoc kurz & klar erklären („Markieren → Speichern → Fertig“).

Vertrauenswürdigkeit & Lokalität hervorheben (keine Cloud, keine Telemetrie).

Sofortiger Call-to-Action zum Chrome Web Store (+ optional GitHub-Repo).

Die unterschiedlichen Trigger (Kontextmenü, FAB, Shortcuts) und Formate zeigen.

Kernzielgruppe

Developer, Data Analysts, Tech-affine Knowledge-Worker, die viel in Browser-Tools arbeiten (APIs, Logs, Dashboards, Doku, Foren).

Scope Landingpage (In-Scope)

Eine einzige statische Seite index.html mit eingebettetem CSS.

Hero-Section mit Logo, Tagline, CTA-Buttons.

Sektionen: „So funktioniert’s“, „Formate & Anwendungsfälle“, „Screenshots“, „Datenschutz“.

Verlinkungen: Chrome Web Store (Platzhalter-URL), GitHub-Repo DYAI2025/FlashDoc.

Out-of-Scope

Kein Backend, keine Formulare, kein Analytics-Tracking.

Keine komplexe Blog-/Doku-Struktur.

Gestaltungskonzept (Solution Concept)
Logisch scheint mir sinnvoll:

Design, das an deine Screenshots anlehnt: dunkler Hintergrund, violette/indigoblaue Cards, gelber Blitz als Key-Visual, pinke Badges.

Mobile-first, einspaltig; ab ~960px dreispaltige Feature-Grid.

Die von dir gelieferten Logo-/Screenshot-Bilder als Hero-Visual und in einer Screenshot-Galerie.

Requirements-Extrakt
Funktionale Anforderungen (FR)
Logisch scheint mir, dass folgende FRs reichen:

FR-1 (H)
Die Seite zeigt im Hero-Bereich: FlashDoc-Logo, Claim, kurze Erklärung und einen primären CTA-Button „Zu Chrome hinzufügen“ (Link zum Chrome Web Store).

FR-2 (H)
Ein zweiter CTA-Button verlinkt auf das GitHub-Repo https://github.com/DYAI2025/FlashDoc.

FR-3 (M)
Sektion „So funktioniert’s“ erklärt in 3 klaren Schritten den Flow: Text markieren → FlashDoc auslösen → Datei im Download-Ordner.

FR-4 (H)
Sektion „Formate & Trigger“ listet unterstützte Dateitypen (Text, Code, Daten, Dokumente, Label) und Erfassungswege (Kontextmenü, Shortcuts, Floating-Button, Auswahl-Button).

FR-5 (M)
Sektion „100 % lokal & sicher“ beschreibt, dass keine Daten den Rechner verlassen und welche Permissions/Infrastruktur genutzt werden (kurz).

FR-6 (M)
Screenshot-Galerie zeigt mindestens 2–3 deiner mitgelieferten FlashDoc-Bilder.

FR-7 (M)
Footer mit Hinweis auf Manifest V3, Browser-Kompatibilität (Chrome/Edge) und Link zur GitHub-Issues-Seite für Feedback.

Nicht-funktionale Anforderungen (NFR)
NFR-1 (H)
Seite ist als einzelne statische HTML-Datei nutzbar (keine Build-Chain nötig).

NFR-2 (H)
Layout ist responsive (mobil, Tablet, Desktop) mit lesbarer Typografie und ausreichend Kontrast.

NFR-3 (M)
Keine externen Skripts oder Fonts sind zwingend erforderlich; Seite funktioniert offline.

NFR-4 (M)
Bilder sind als separate Dateien referenziert und können leicht ausgetauscht werden (klare Klassennamen & Kommentare).

Success Criteria (SC)
SC-1 (H)
Testperson versteht innerhalb von 5 Sekunden, dass FlashDoc markierten Text mit einem Klick als Datei speichert (Hero-Claim + Subline).

SC-2 (H)
Chrome-Web-Store-CTA ist „above the fold“ sichtbar und eindeutig als Primärhandlungsaufforderung erkennbar.

SC-3 (M)
Auf einem Smartphone (≤ 400px Breite) sind alle Sektionen ohne horizontales Scrollen nutzbar.

SC-4 (M)
Alle Links (Chrome Web Store, GitHub Repo, GitHub Issues) funktionieren und sind klar beschriftet.

Implementierungsplan für AI-Agent
A) Kontext
Faktisch korrekt sage ich:

Title: Landingpage „FlashDoc – Instant Document Creator“

Kurzbeschreibung: Eine minimalistische, dunkle One-Pager-Landingpage, die die Browser-Extension FlashDoc erklärt und einen klaren CTA zum Chrome Web Store bietet.

Scope / Non-Scope siehe oben.

KPIs (aus SC):

Klarheit der Botschaft (SC-1), Sichtbarkeit CTA (SC-2), Responsiveness (SC-3), funktionierende Links (SC-4).

B) Technischer Rahmen
Faktisch korrekt sage ich:

Tech-Stack:

Reine statische Datei: index.html mit eingebettetem <style>.

Keine Abhängigkeiten, nur HTML5 & CSS3.

Architektur-Overview

Struktur: <header> (Navigation & CTA) → <main> mit 4 Sektionen (Hero, How-it-works, Features/Formats, Screenshots & Privacy) → <footer>.

Bilder liegen in z. B. assets/ und werden per <img> referenziert.

Designentscheidungen

Dunkler Hintergrund mit violett/blauem Verlauf, um die Extension-Screenshots optisch aufzunehmen.

Akzentfarbe Gelb (⚡) für CTA und Icons; pinke Badges für „Neu“/„Chrome & Edge“.

Maximalbreite 1120px für den Inhalt, zentriert.

C) Work Plan (Phasen & Tasks)
Logisch scheint mir, dass ein AI- oder Human-Executor mit wenigen Tasks auskommt.

T1 – Projektstruktur anlegen
ID: T1

Title: Basisdatei & Ordnerstruktur anlegen

Description:
Lege einen Ordner flashdoc-landing/ an, darin index.html und einen Unterordner assets/ für Bilder. Kopiere die bereitgestellten Logo-/Screenshot-Dateien in assets/.

Artifacts:

flashdoc-landing/index.html

flashdoc-landing/assets/*.png

DoD:

Ordner vorhanden, index.html existiert leer oder mit Grundgerüst.

Alle gewünschten Bilder aus dem Repo/Uploads in assets/.

Dependencies: –

Coverage: FR-6, NFR-4

T2 – HTML & CSS Landingpage implementieren
ID: T2

Title: Landingpage-Layout und Styling implementieren

Description:
Ersetze den Inhalt von index.html durch den folgenden Code und passe die Bildpfade/Links an deine reale Umgebung an (insb. Web-Store-URL & Asset-Dateinamen).