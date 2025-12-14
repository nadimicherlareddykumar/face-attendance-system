# 📸 Face Attendance System (ArcFace Enhanced)

A state-of-the-art **Face Recognition Attendance System** built with a modern tech stack. This application leverages the power of **ArcFace** for high-accuracy face recognition, identifying individuals even in challenging conditions (low light, long distance, masks). It features a sleek, responsive **React** frontend and a robust **Node.js** backend.

![Project Banner](https://via.placeholder.com/1200x400?text=Face+Attendance+System+Dashboard)
*(Replace this placeholder with an actual screenshot of your dashboard!)*

## 🚀 Features

*   **⚡ Real-Time Recognition**: Instant face detection and recognition using ArcFace/InsightFace models.
*   **📊 Dynamic Dashboard**: View attendance statistics, charts, and logs in real-time.
*   **📝 Auto-Attendance**: Automatically marks attendance based on facial recognition.
*   **👥 Easy Enrollment**: Simple UI for enrolling new students/employees with auto-capture.
*   **📅 Reports**: Generate and export detailed attendance reports.
*   **🎨 Modern UI**: Beautiful, dark-mode focused interface built with TailwindCSS.

## 🛠️ Technology Stack

### Frontend
*   **Framework**: [React](https://react.dev/) (v19)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
*   **State/Routing**: React Router DOM
*   **Charts**: Recharts

### Backend
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: SQLite3 (via Mongoose/ORM logic as applicable)
*   **API Pattern**: RESTful API

### AI / Computer Vision Engine
*   **Language**: Python 3.x
*   **Libraries**:
    *   `onnxruntime-gpu` (or `onnxruntime`) for Model Inference
    *   `opencv-python` for Image Processing
    *   `numpy` for Numerical Operations
    *   `insightface` / ArcFace models for Embeddings

## 📂 Project Structure

```bash
├── facefrontend/          # React Frontend Application
├── python-face-api/       # Python Face Recognition Engine & Models
├── server/                # Node.js Express Backend Server
└── README.md              # Documentation
```

## ⚡ Getting Started

### Prerequisites

Ensure you have the following installed:
*   **Node.js** (v18+ recommended)
*   **Python** (v3.8+)
*   **pip** (Python package manager)

### 1. Installation

**Clone the repository:**
```bash
git clone https://github.com/your-username/face-attendance-system.git
cd face-attendance-system
```

**Install Frontend Dependencies:**
```bash
cd facefrontend
npm install
```

**Install Backend Dependencies:**
```bash
cd ../server-20251120T131707Z-1-001/server
npm install
```

**Install Python Dependencies:**
```bash
cd ../../python-face-api-20251120T131704Z-1-001/python-face-api
pip install -r requirements.txt  # If requirements.txt exists, otherwise install manually:
# pip install numpy opencv-python onnxruntime-gpu requests
```

### 2. Running the Application

You can start the entire system (Frontend + Backend + Python Engine) from the frontend directory if the scripts are configured, or run them individually.

**Option A: Quick Start (from frontend)**
```bash
cd facefrontend
npm run start:all
```
*(Note: Ensure paths in `package.json` scripts match your local folder structure)*

**Option B: Manual Start (3 Terminals)**

**Terminal 1: Backend**
```bash
cd server-20251120T131707Z-1-001/server
node server.js
```

**Terminal 2: Python Engine**
```bash
cd python-face-api-20251120T131704Z-1-001/python-face-api
python recognize_api.py
```

**Terminal 3: Frontend**
```bash
cd facefrontend
npm run dev
```

## 🖼️ Usage

1.  Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).
2.  **Dashboard**: Monitor live attendance.
3.  **Enrollment**: Go to the "Enroll" page to add new faces.
4.  **Attendance Log**: Check detailed logs of entry/exit times.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.
