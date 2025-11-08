# 🧩 QueueCTL - Background Job Queue System (Node.js)

A **CLI-based background job queue system** built using **Node.js**, designed to manage asynchronous job execution with multiple workers, automatic retries, exponential backoff, and a **Dead Letter Queue (DLQ)** for failed jobs.

---

## 🚀 Features

✅ Enqueue background jobs (shell commands)  
✅ Persistent storage using **SQLite**  
✅ Multiple worker processes  
✅ Automatic retries with **exponential backoff**  
✅ Dead Letter Queue (DLQ) for failed jobs  
✅ Graceful worker shutdown  
✅ Configurable retry count, backoff base, and poll interval  
✅ Cross-platform support (Windows / macOS / Linux)

---

## 🧠 Architecture Overview

### **Core Components**
| File | Purpose |
|------|----------|
| `src/cli.js` | Command-line interface (CLI) for QueueCTL |
| `src/queue.js` | Job management - enqueue, list, retry, DLQ |
| `src/worker.js` | Worker lifecycle - polling, processing, backoff |
| `src/db.js` | Persistent job storage using SQLite |
| `src/config.js` | Read/write configuration |
| `data/` | Stores SQLite DB (`queue.db`) and PID file (`worker.pid`) |

---

### **Job Lifecycle**

| **State** | **Description** |
|------------|-----------------|
| `pending` | Waiting to be picked by a worker |
| `processing` | Being executed by a worker |
| `completed` | Successfully executed |
| `failed` | Failed but will retry |
| `dead` | Moved to DLQ after retries exhausted |

---

### **Retry & Backoff**

When a job fails, it retries automatically with a delay defined by:
```
delay = base ^ attempts   (in seconds)
```

Example: with `backoff_base = 2`, retries happen after 2s, 4s, 8s...

After exceeding `max_retries`, the job moves to the **Dead Letter Queue (DLQ)**.

---

## ⚙️ Tech Stack

- **Node.js** (v18+)
- **better-sqlite3** — local persistent database
- **commander.js** — CLI command parser
- **dayjs** — timestamp management
- **uuid** — job IDs

---

## 📦 Installation

### 1️⃣ Clone & install dependencies
```bash
git clone https://github.com/<your-username>/queuectl.git
cd queuectl
npm install
```

### 2️⃣ (Optional) Make the CLI globally available
```bash
npm link
```

Now you can run:
```bash
queuectl enqueue "echo Hello Queue"
```

---

## 💻 Usage Examples

### 🧱 Enqueue a new job
```bash
node src/cli.js enqueue echo "Hello from QueueCTL"
```

or, if globally linked:
```bash
queuectl enqueue echo "Hello from QueueCTL"
```

---

### 🏃 Start worker(s)
```bash
node src/cli.js worker:start --count 1
```

> The worker will keep polling for new jobs and process them automatically.

---

### 🛑 Stop workers
```bash
node src/cli.js worker:stop
```

---

### 📊 View status
```bash
node src/cli.js status
# Output example:
# pending: 1
# completed: 3
# dead: 1
```

---

### 📋 List jobs by state
```bash
node src/cli.js list --state completed
node src/cli.js list --state pending
node src/cli.js list --state dead
```

---

### ⚰️ Dead Letter Queue (DLQ)

List DLQ jobs:
```bash
node src/cli.js dlq:list
```

Retry a DLQ job:
```bash
node src/cli.js dlq:retry <job-id>
```

---

### ⚙️ Manage Configuration

Show current config:
```bash
node src/cli.js config:get
```

Set configuration values:
```bash
node src/cli.js config:set max_retries 3
node src/cli.js config:set backoff_base 2
node src/cli.js config:set poll_interval_seconds 2
```

---

## 🧪 Testing the System

### 🧠 Basic Tests

| **Test** | **Expected Result** |
|----------|---------------------|
| `enqueue echo "Hello"` | Job appears as `pending` |
| `worker:start` | Worker picks and executes job |
| Job command succeeds | State → `completed` |
| Failing command (`node -e "process.exit(1)"`) | Retries, then moves to `dead` |
| Restart worker after job | Persistent job data remains |

---

### 🔍 Quick Test Script (PowerShell)

Create `scripts/test_flows.ps1` and run:
```powershell
# PowerShell quick test
Remove-Item .\data\worker.pid -ErrorAction SilentlyContinue
Start-Process node -ArgumentList "src/cli.js worker:start --count 1"
Start-Sleep -Seconds 2

node src/cli.js enqueue echo "test success $(Get-Date -Format o)"
node src/cli.js enqueue "node -e \"process.exit(2)\""

Start-Sleep -Seconds 4
node src/cli.js status
node src/cli.js dlq:list

$pid = Get-Content .\data\worker.pid
Stop-Process -Id $pid -Force
Remove-Item .\data\worker.pid -ErrorAction SilentlyContinue
```

---

### 🧾 Sample Output
```
✅ Enqueued job: 26ee5395-a6c5-4c36-9d36-0e27c50531d6
✅ Enqueued job: b7c6da23-8d10-44bb-88a1-fdc23e8b2af7

Starting 1 workers (pid=24700).
Use 'queuectl worker stop' to stop.

completed: 3
dead: 1
```

---

## 🗂 Folder Structure
```
queuectl/
├── src/
│   ├── cli.js          # CLI commands
│   ├── queue.js        # Job queue management
│   ├── worker.js       # Worker loop, retries, DLQ
│   ├── db.js           # SQLite setup
│   ├── config.js       # Config persistence
├── data/
│   ├── queue.db        # SQLite job database
│   ├── worker.pid      # Current worker PID
├── package.json
├── package-lock.json
├── README.md
└── scripts/
    ├── test_flows.ps1
    └── show-job.js
```

---

## 🧩 Assumptions & Design Decisions

* SQLite chosen for durability & zero dependencies.
* Worker locking handled via atomic `UPDATE` statement.
* Exponential backoff avoids flooding retries.
* One DB → supports multiple workers safely.
* No network or external APIs; pure local CLI execution.

---

## 💡 Future Improvements (Bonus Ideas)

* [ ] Job output logs saved per file in `logs/`
* [ ] Job priority support
* [ ] Job timeout configuration
* [ ] Scheduled (`run_at`) jobs
* [ ] Web dashboard with job stats

---

## 📊 Evaluation Readiness Checklist

| Requirement | Implemented |
|-------------|-------------|
| CLI commands (`enqueue`, `list`, `worker`, `config`) | ✅ |
| Persistent job storage | ✅ |
| Retry + exponential backoff | ✅ |
| DLQ functionality | ✅ |
| Multi-worker support | ✅ |
| Graceful shutdown | ✅ |
| Config management | ✅ |
| Comprehensive README | ✅ |
| Test scripts included | ✅ |

---



## 📹 Demo 

### 1️⃣ Enqueue a Job

![alt text](/queuectl/screenshots/image.png)

### 2️⃣ Start a Worker
![alt text](/queuectl//screenshots/image-1.png)


### 3️⃣ View Status
![alt text](/queuectl//screenshots/image-2.png)

### 4️⃣ List Jobs by State
![alt text](/queuectl/screenshots/image-3.png)

### 5️⃣ Dead Letter Queue (Optional)

![alt text](/queuectl/screenshots/image-5.png)