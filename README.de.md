# IELTS Writing Lab

## Sprache

[English](README.md) | **Deutsch** | [Tiếng Việt](README.vi.md)

Ein KI-gestützter, lokal ausgerichteter Arbeitsbereich zur Vorbereitung auf IELTS Academic: Writing, Reading, Listening, Speaking, Vocabulary und Lernfortschritt.

Die Anwendung läuft im Browser und unterstützt sowohl Cloud-KI-Anbieter als auch ein projektlokales Ollama-Modell. Sie ist für das persönliche Lernen gedacht und steht in keiner Verbindung zu IELTS, Cambridge University Press & Assessment oder dem British Council.

> Alle Screenshots verwenden anonyme Demodaten. Persönliche Lerndaten, API-Schlüssel, lokale Datenbanken, Modelldateien und Laufzeitumgebungen sind vom öffentlichen Projekt ausgeschlossen.

![IELTS Writing Lab Dashboard](screenshots/dashboard.png)

## Funktionen

### Writing

Übe Task 1, Task 2 oder einen vollständigen Writing-Test mit Zeitlimit. Der Arbeitsbereich kombiniert Fragengenerierung, Planung, Micro-Drills, Aufsatzentwürfe, KI-Bewertung, Musterantworten, Satzfeedback, Überarbeitungstraining und ein Fehlerarchiv.

![Writing-Arbeitsbereich](screenshots/writing.png)

### Reading

Erstelle kurze Übungen, einzelne Abschnitte oder vollständige Tests. Die Anwendung unterstützt verschiedene Fragetypen, strenge Antwortprüfung, Notizen, Markierungen, Timer und Auswertungen.

![Reading-Testoberfläche](screenshots/reading-test.png)

![Steuerung der Reading-Generierung](screenshots/reading-generate.png)

Hochgeladene Reading-Dokumente werden als vollständige Tests verarbeitet. Die KI wird angewiesen, alle Passagen, Anweisungen, Fragen, Optionen, Nummern und deren ursprüngliche Reihenfolge beizubehalten.

![Reading-Datensatz und Testimport](screenshots/reading-dataset.png)

![Reading-Strategietrainer](screenshots/reading-strategies.png)

### Listening

Erstelle IELTS-ähnliche Listening-Teile, importiere Quellen, verwalte eine lokale Bibliothek und überprüfe Antworten. Optional kann das Speaking-Backend lokale Stimmen über Supertonic erzeugen.

![Listening-Arbeitsbereich](screenshots/listening.png)

### Speaking

Offline-Übungen funktionieren ohne Backend. Mit dem optionalen FastAPI-Backend stehen Fragenbibliotheken, lokale Whisper-Transkription, akustische Analyse, Bewertung und ein Verlauf gespeicherter Versuche zur Verfügung.

![Speaking-Fragenbibliothek](screenshots/speaking.png)

### Vocabulary

Lerne die Academic Word List mit Wiederholungsplan, Definitionen, Beispielen, Wortfamilien, Lückentexten, Kollokationen, Importen, Quiz und optionaler KI-Erweiterung.

![Vocabulary-Lernkarte](screenshots/vocabulary.png)

### Dashboard und Einstellungen

Das Dashboard zeigt Lernplan, Erinnerungen, Aktivität, Punktverlauf, Wiederholungen und Schwächen. In den Einstellungen werden Ziele, KI-Anbieter, lokales Modell, Speaking-Backend, Speicher und Datenimport/-export verwaltet.

![Fortschrittsübersicht](screenshots/dashboard-progress.png)

![Einstellungen und lokale KI](screenshots/settings-local-ai.png)

## Betriebsarten

| Modus | Start | Geeignet für | Einschränkungen |
|---|---|---|---|
| Direkt öffnen | Doppelklick auf `index.html` | Schneller Start und normale Browserübungen | Nur Browserspeicher; CORS kann Importe und Anbieter einschränken |
| Lokaler App-Server | `node scripts/serve.mjs` | Empfohlene tägliche Nutzung | Benötigt Node.js; läuft unter `http://localhost:5173` |
| Projektlokale KI | `start-local-ai.bat` | KI ohne Cloud-API-Schlüssel | Windows; benötigt mehrere GB Speicher und ausreichend RAM/VRAM |
| Speaking-Backend | `start-speaking-backend.bat` | Bewertetes Speaking und optionales Listening-TTS | Benötigt Python und `ffmpeg` |

Die Modi können kombiniert werden.

## Schnellstart

### Einfacher Browsermodus

1. Repository klonen oder herunterladen.
2. `index.html` doppelklicken.
3. Unter **Settings** einen KI-Anbieter hinzufügen oder Funktionen ohne KI verwenden.
4. Regelmäßig Sicherungen über **Settings > Data Management** exportieren.

### Empfohlener lokaler Server

```powershell
node scripts/serve.mjs
```

Danach `http://localhost:5173` öffnen. Für die Browseranwendung ist kein `npm install` erforderlich.

## Projektlokale KI unter Windows

Das Repository enthält keine mehrere Gigabyte großen Laufzeit- oder Modelldateien. Das Setup erstellt eine portable Ollama-Laufzeit und einen Modellspeicher im ignorierten Verzeichnis `.local/`.

Einmalig ausführen:

```powershell
.\setup-local-ai.bat
```

Starten und stoppen:

```powershell
.\start-local-ai.bat
.\stop-local-ai.bat
```

Die lokale API läuft unter `http://localhost:11434`. Eine Deinstallation des systemweiten Ollama beeinflusst die projektlokale Kopie nicht.

## Speaking-Backend

Lokale Einrichtung ohne Cloud-API-Schlüssel:

```powershell
.\setup-local-ai.bat
.\setup-speaking-backend-local.bat
.\start-speaking-backend.bat
```

Installiere `ffmpeg`, damit im Browser aufgenommene Audiodateien dekodiert werden können:

```powershell
winget install Gyan.FFmpeg
```

Weitere Informationen: [speaking-backend/README.md](speaking-backend/README.md)

## Dokumentimport

Der lokale App-Server kann PDF-, Word-, Präsentations-, Tabellen-, HTML-, CSV- und weitere unterstützte Dateien mit MarkItDown konvertieren:

```powershell
node scripts/setup-markitdown.mjs
node scripts/serve.mjs
```

## Daten und Datenschutz

Das Projekt besitzt kein Kontosystem, keinen Analysedienst und kein gehostetes Backend.

| Speicherort | Inhalt | Git-Verhalten |
|---|---|---|
| Browser `localStorage` | Lernfortschritt, Texte, Tests, Entwürfe und API-Konfiguration | Nicht Teil des Projektordners |
| `data/app-state.json` | Optionale lokale Kopie des Lernstands | Von Git ignoriert |
| `speaking-backend/data/` | Lokale Speaking-SQLite-Daten | Von Git ignoriert |
| `.local/` | Ollama-Laufzeit, Modelle und Logs | Von Git ignoriert |
| `markitdown-venv/` | Python-Umgebung für Dokumentkonvertierung | Von Git ignoriert |

Cloud-KI, Wikipedia-Grundlagen, URL-Importe und andere Netzwerkfunktionen senden Daten außerhalb des Computers. Committe niemals persönliche Daten, `.env`-Dateien, Modelle, Datenbanken, Laufzeitordner oder API-Schlüssel.

## Entwicklung

```powershell
# Anwendung nach Änderungen unter src/ neu bauen
node scripts/build.mjs

# Lokalen App-Server starten
node scripts/serve.mjs

# Optionale Dokumentimport-Umgebung erstellen
node scripts/setup-markitdown.mjs
```

Bearbeite Dateien unter `src/`. `dist/app.jsx` und `index.html` werden durch `scripts/build.mjs` generiert.

## Einschränkungen

- KI-Feedback ist keine offizielle IELTS-Bewertung.
- Generierte oder extrahierte Fragen müssen weiterhin menschlich geprüft werden.
- Die Qualität lokaler Modelle hängt von Modell und Hardware ab.
- Die Anwendung ist Desktop-orientiert und für eine einzelne Person ausgelegt.
- Cloud-Funktionen können Kosten verursachen und Anbieterlimits unterliegen.
- Du bist für die Rechte an importierten oder weitergegebenen Lernmaterialien verantwortlich.

## Lizenz

Quellcode und Projektdokumentation stehen unter der [MIT-Lizenz](LICENSE). Die Lizenz gewährt keine Rechte zur Weitergabe fremder Audioinhalte, Transkripte, importierter Passagen, kopierter Prüfungsinhalte, persönlicher Datensätze, Benutzerexporte oder API-Schlüssel.
