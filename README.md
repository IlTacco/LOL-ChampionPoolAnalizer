# LoL Matchup Analyzer ⚔️

Tool interattivo per l'analisi dei matchup e della copertura del champion pool in League of Legends, basato su statistiche competitive (Patch 16.23) e **Riot Data Dragon**.

---

## 🎯 Funzionalità Principali

1. **Tabella a Doppia Entrata (Matrix View)**:
   - **Colonna a Sinistra (Righe)**: Tutti i campioni avversari del ruolo selezionato, con portrait, nome, **Tier di meta (S+, S, A, B, C, D)**, winrate e pickrate generale.
   - **Riga Superiore (Colonne)**: I campioni che puoi giocare (il tuo champion pool).
   - **Celle di Intersezione**: Winrate percentuale del tuo campione contro l'avversario corrispondente:
     - 🟩 **Verde Intenso**: Winrate $\ge 53.0\%$ (Matchup nettamente favorevole).
     - 🟢 **Verde Chiaro**: $50.1\% \le \text{WR} < 53.0\%$ (Vantaggio leggero).
     - ⬜ **Neutro / Grigio**: $\sim 50\%$ (Skill matchup o speculare).
     - 🟧 **Arancione / Rosso Chiaro**: $47.0\% \le \text{WR} < 50.0\%$ (Svantaggio).
     - 🟥 **Rosso Intenso**: $\text{WR} < 47.0\%$ (Hard counter avversario).
   - 👑 **Miglior Pick**: Corona dorata evidenziata sulla colonna con il miglior winrate per ogni riga.
   - 🔍 **Dettagli al Passaggio del Mouse**: Tooltip con numero di partite analizzate, $\pm$ Gold @15m, $\pm$ CS @15m e $\pm$ XP @15m.

2. **Personalizzazione e Salvataggio del Pool**:
   - Champion pool personalizzabile e salvato per ciascuna corsia in `localStorage`.
   - Modale di ricerca rapida con catalogo campioni, badge di tier e winrate per aggiungere o rimuovere campioni con un click.

3. **Analisi dei "Campioni Scoperti" (Coverage Analysis)**:
   - Identificazione in tempo reale di tutti i campioni avversari per cui non possiedi **alcun campione nel pool con più del 50% di winrate**.
   - Indicatore circolare con percentuale di copertura del pool (es. $93.2\%$).
   - Pulsante **"Filtra solo scoperti"** per isolare istantaneamente le minacce da bannare o contro cui prepararsi.
   - **Consiglio Smart**: Suggerisce automaticamente quale campione aggiungere al pool per coprire il maggior numero di falle.

4. **Selettore Corsia & Elo**:
   - Corsie: **Top, Jungle, Mid, ADC / Bot, Support** con pool indipendenti e statistiche dedicate.
   - Elo: **Emerald+ (Competitivo), Diamond+, Master+, Platinum+, Tutti i Livelli (Overall)**.

5. **Quick Pick Draft Helper**:
   - Barra di ricerca rapida "L'avversario ha scelto...": mostra all'istante il miglior pick del tuo pool, il vantaggio in gold medio e le alternative ordinate dal migliore al peggiore.

---

## 🚀 Come Avviare il Tool

Il server locale è già in esecuzione su:
👉 **[http://localhost:8080/](http://localhost:8080/)**

Per riavviarlo in futuro:
- Fai doppio click sul file [start.bat](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/start.bat) oppure esegui da terminale:
  ```powershell
  powershell -ExecutionPolicy Bypass -File server.ps1
  ```

---

## 📁 Struttura dei File

- [index.html](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/index.html): Interfaccia grafica principale dell'applicazione.
- [app.css](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/app.css): Stile tema Hextech scuro di League of Legends.
- [app.js](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/app.js): Controller dell'interfaccia e gestione dello stato.
- [matchup_engine.js](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/matchup_engine.js): Motore logico di calcolo della matrice, copertura e raccomandazioni.
- [data_service.js](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/data_service.js): Servizio dati, gestione cache e chiamate a U.GG.
- [bundled_meta.json](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/bundled_meta.json): Database locale dei campioni, ruoli, winrate e tier U.GG.
- [matchups_lane_compact.json](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/matchups_lane_compact.json): Cache compatta delle statistiche di matchup testa a testa.
- [server.ps1](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/server.ps1): Server HTTP statico locale leggero.
- [start.bat](file:///C:/Users/gallon/.gemini/antigravity/scratch/lol-matchup-analyzer/start.bat): Script di avvio con un click.
