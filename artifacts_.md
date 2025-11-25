Artifacts:

flashdoc-landing/index.html (siehe oben).

DoD:

Seite baut ohne Fehler im Browser.

Hero, Sektionen, Screenshots und Footer sind sichtbar.

Platzhalter EXTENSION_ID im Chrome-Web-Store-Link ist gegen die echte ID ersetzt.

Bildpfade zeigen auf deine realen Assets.

Dependencies: T1

Coverage: FR-1–FR-7, NFR-1–NFR-4, SC-1–SC-4

T3 – Manuelle Tests & Feinschliff
ID: T3

Title: Responsiveness und Links testen

Description:
Öffne index.html in Desktop- und Mobile-Ansicht (DevTools Device Mode). Prüfe Text, Layout und alle Links. Justiere Abstände, Texte oder Bildwahl, falls nötig.

Artifacts:

ggf. aktualisierte index.html

DoD:

Seite bricht auf ~360px Breite nicht horizontal.

Chrome-Web-Store- und GitHub-Links öffnen sich korrekt in neuem Tab.

Texte sind fehlerfrei und passen zu deinem Branding.

Dependencies: T2

Coverage: SC-1–SC-4, NFR-2

D) Tests & Validierung
Logisch scheint mir, dass wenige, klare Tests reichen:

TS-1 – Inhalt & Message

Typ: Manuell, Explorativ

Schritte: 3 Testpersonen, die FlashDoc noch nicht kennen, 5 Sekunden auf die Seite schauen lassen. Danach die Frage: „Was macht das Tool?“

Erwartung: Mindestens 2 von 3 beschreiben sinngemäß „markierten Text in Dateien speichern“ (SC-1).

TS-2 – CTA-Sichtbarkeit

Typ: Manuell, Visuell

Schritte: Seite auf Standard-Desktop-Viewport (z. B. 1440×900) öffnen.

Erwartung: Primärer CTA „Zu Chrome hinzufügen“ ist ohne Scroll sichtbar (SC-2).

TS-3 – Responsiveness

Typ: Manuell

Schritte: Browserbreite auf 360px, 768px und 1200px einstellen.

Erwartung: Kein horizontales Scrollen, Texte bleiben lesbar, CTA-Buttons gut klickbar (SC-3, NFR-2).

TS-4 – Links & externe Ziele

Typ: Manuell

Schritte: Alle Links anklicken (Chrome Web Store, GitHub Repo, Issues).

Erwartung: Alle Ziele öffnen korrekt in neuem Tab, keine 404 (SC-4).

Coverage-Matrix FR→Tasks→Tests
Faktisch korrekt sage ich, dass folgende Abdeckung entsteht:

ID	Typ	Kurzbeschreibung	Tasks	Tests	Notizen
FR-1	FR	Hero mit Logo, Claim, Web-Store-CTA	T2	TS-1, TS-2	CTA-Link EXTENSION_ID ersetzen
FR-2	FR	GitHub-Link	T2	TS-4	Repo-URL fest
FR-3	FR	„So funktioniert’s“-Sektion	T2	TS-1	3 Schritte im Text
FR-4	FR	Formate & Trigger-Übersicht	T2	TS-1	4 Karten
FR-5	FR	Datenschutz-/Lokalitäts-Section	T2	TS-1	Privacy-List
FR-6	FR	Screenshot-Galerie mit mehreren Bildern	T1, T2	TS-3	Bilder aus Assets-Ordner
FR-7	FR	Footer mit Manifest-Hinweis & Issues-Link	T2	TS-4	
NFR-1	NFR	Single-File-statische Seite	T2	TS-4	Nur index.html
NFR-2	NFR	Responsives Layout	T2, T3	TS-3	Mobile-Checks
NFR-3	NFR	Keine externen Skripte nötig	T2	TS-4	Nur kleiner Inline-JS fürs Jahr
NFR-4	NFR	Bilder leicht austauschbar	T1, T2	TS-3	Klar kommentierte Pfade
SC-1	SC	Botschaft in 5 Sekunden klar	T2, T3	TS-1	Hero-Claim
SC-2	SC	CTA above the fold	T2, T3	TS-2	Hero-Layout
SC-3	SC	Gute Darstellung auf Mobil	T2, T3	TS-3	Media Queries
SC-4	SC	Funktionierende Links	T2, T3	TS-4	Alle href getestet

Zeitplan (Day 0–7 Ship-Loop)
Rein subjektiv, aus meinem Denken ergibt sich ein schlanker Mini-Plan:

Day 0

Ziel schärfen, Branding & Assets sammeln (Logos, Screenshots).

Task: T1 teilweise.

Day 1–2

Umsetzung des HTML/CSS basierend auf obigem Template (T2).

Erstes manuelles Testing auf dem eigenen Rechner.

Day 3

2–3 Kolleg:innen oder Testpersonen drüber schauen lassen (TS-1, TS-2).

Copy & Text ggf. nachschärfen.

Day 4–5

Feinschliff Responsiveness & Abstände, ggf. alternative Screenshots testen (T3, TS-3).

Day 6

Finaler Link-Check, Web-Store-URL final einsetzen, TS-4 durchführen.

Day 7

Landingpage deployen (z. B. GitHub Pages, Netlify, eigener Server) und Link im Web Store / README verlinken.

Risiken & Annahmen
Logisch scheint mir:

Annahmen

Du kennst oder bekommst die finale Chrome-Web-Store-URL inklusive Extension-ID.

Die bereitgestellten Logos/Screenshots dürfen ohne Branding-Konflikte öffentlich auf der Landingpage verwendet werden.

Hosting erfolgt auf einer statischen Plattform ohne spezielle Build-Anforderungen.

Risiken

R1: Falsche oder veraltete Extension-URL

Mitigation: Vor Livegang Link manuell testen, bei Update im Web Store README & Landingpage synchron halten.

R2: Zu viel Text für eine „kleine“ Landingpage

Mitigation: Bei Bedarf einzelne Sektionen ausblenden (z. B. Screenshots oder Teile der Privacy-Sektion), ohne die Struktur zu zerstören.

R3: Asset-Pfade stimmen nicht

Mitigation: Nach Deployment in Browser-Konsole 404-Bilder prüfen und Pfade anpassen.