# LegendIDE

**LegendIDE** — a collaborative web IDE built with React + Vite.  
A core feature: **shared AI context across teammates** — the IDE preserves team context (edits, reviews, and decisions) so integrated AI agents can understand each teammate’s intent and the project’s decision history.

---
- [Find it on Devpost](https://devpost.com/software/legendide  )
---

## Key Features
- Real-time multi-file code editor with syntax highlighting (Monaco Editor)  
- Integrated terminal (node-pty) and run button (supports Python, C++, JS, Go, Ruby)  
- File explorer and workspace defaults for competitive programming (`dev/codeforces/`)  
- **Shared context persistence**: captures edits, decisions and history so AI assistants can reason across teammates’ activity  
- Lightweight, Vite + React frontend with a node backend for terminal/file ops

---

## Tech Stack
- Frontend: React + Vite, Monaco Editor  
- Backend: Node.js (terminal server using `node-pty`)  
- Packaging: npm / package.json

---

## Local Setup (developer)
1. Clone:
   ```bash
   git clone https://github.com/FaisalXL/LegendIDE.git
   cd LegendIDE
   ```

2. Install:

```
npm install
```
3. Start terminal backend:
```
node terminal-server.cjs
```

Start frontend:
```
npm run dev
```


Built during CalHacks. Inspired by collaborative IDEs and AI-assisted coding workflows.
