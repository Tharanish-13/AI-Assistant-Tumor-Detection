# AI Tumor Detection System

## 🏥 Problem Statement
Medical imaging is critical for detecting and diagnosing abnormalities such as tumors across various organs (brain, liver, lungs, prostate). However, manual analysis by radiologists is often time-consuming, repetitive, and subject to human error or fatigue. A missed early detection can significantly impact patient outcomes. For hospitals dealing with a high volume of scans, there is a strong need for an automated triage system that can act as a "second reader" to prioritize critical cases, highlight suspicious regions, and pre-fill preliminary radiology reports.

## 💡 Our Solution
The AI Tumor Detection System provides an intelligent, automated AI second reader for medical imaging. The system ingests medical scans (like PNGs or JPEGs of medical images), automatically classifies the organ depicted, and runs a specialized deep learning model to detect, classify, and localize tumors. 

By acting as a triage pipeline, it:
1. Prioritizes high-risk cases.
2. Highlights suspicious findings with precise bounding boxes.
3. Generates preliminary structured findings to assist clinical decision-making. 
Radiologists can review, correct, and finalize these AI-generated findings, bridging the gap between automated detection and clinical expertise.

## 🛠️ Tech Stack
### Frontend
- **Framework:** React 18, Vite
- **Language:** JavaScript
- **Styling:** CSS
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI
- **Machine Learning & AI:** PyTorch, TorchVision
- **Image Processing:** Numpy, Pillow, Pydicom
- **Data Handling:** Python-multipart, Pydantic

## 🏗️ System Architecture
The system employs a 2-stage multi-cancer inference pipeline:
1. **Stage 1 (Organ Classification):** Uploaded images are passed through a classifier that identifies the organ (Brain, Liver, Lung, Prostate) and assigns a confidence score.
2. **Stage 2 (Tumor Detection & Localization):** Based on the classified organ, the image is routed to a specialized submodel (e.g., `brain_model`, `liver_model`). These models predict tumor patterns, calculate confidence scores, and generate bounding box coordinates for localizations (e.g., specific to lung modules or others).

## 🔄 User Flow
1. **Upload:** User (Radiologist/Doctor) uploads a medical scan via the frontend dashboard, optionally providing patient details (Name, ID).
2. **Preprocessing:** The backend receives the image, normalizes it, and converts it to a standard tensor format suitable for the models.
3. **AI Inference:** The 2-stage pipeline categorizes the organ and detects abnormalities.
4. **Results View:** The frontend displays the image alongside AI predictions, tumor confidence scores, graphical bounding boxes, and an automated preliminary report.
5. **Review & Feedback:** The radiologist reviews the findings, modifies or approves the report, and submits feedback which is tracked for audit trails and continuous model improvement.

## 📁 Project Structure
```text
Tumor_Detection/
├── backend/
│   ├── app.py                 # FastAPI application entry point
│   ├── model.py               # AI Inference Pipeline & model loading logic
│   ├── models/                # ML model definitions (Organ, Brain, Liver, Lung...)
│   ├── training/              # Scripts to train individual organ models
│   ├── utils/                 # Helper utilities (image loading, dicom processing)
│   ├── uploads/               # Temporary storage for incoming scans
│   ├── requirements.txt       # Python dependencies
│   └── verify_pipeline.py     # Pipeline testing script
├── frontend/
│   ├── src/                   # React components, pages, and UI logic
│   ├── public/                # Static assets
│   ├── package.json           # Node.js dependencies and scripts
│   ├── vite.config.js         # Vite configuration
│   └── index.html             # Main HTML entry
└── README.md                  # Project documentation
```

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### Running the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash# Windows
   python -m venv venv
   venv\Scripts\activate
   # Linux/macOS
   # source venv/bin/activate 
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

### Running the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🧠 Model Training Commands
To train or re-train the organ-specific models, you can run the provided scripts in the `backend/training` directory. Ensure you have the datasets properly configured inside `backend/training/` or mapped correctly in the code before running these scripts.

Open a terminal in the `backend/training` directory and run:

```bash
# Train the initial Stage 1 Organ Classifier
python train_classifier.py

# Train Stage 2 Body Organ Models
python train_brain.py
python train_liver.py
python train_lung.py
python train_prostate.py
```

## 🐳 Docker Deployment Strategies
To prepare the system for production or easy collaborative deployment, you can containerize both the frontend and backend using Docker and `docker-compose`.

### Docker-Compose Approach (Recommended)
You should create a `docker-compose.yml` file with two services:
1. **Backend Service:** Create a `Dockerfile` in the `backend/` directory utilizing a Python 3.10+ image. Install `requirements.txt`, setup CUDA (if running on a GPU server), and expose port 8000 running Uvicorn.
2. **Frontend Service:** Create a multi-stage `Dockerfile` in the `frontend/` directory. 
   - *Stage 1:* Use a Node image to build the static React files (`npm run build`).
   - *Stage 2:* Serve the `dist/` folder using an Nginx lightweight image on port 80.
3. Configure networking so the frontend reverse-proxies API calls directly to the backend service.

### Cloud Deployment & Scaling
- **Kubernetes (K8s) / AWS ECS:** Map the Docker images to a managed container service. The backend can be scaled horizontally behind a Load Balancer since the Model Inference pipeline is stateless.
- **GPU Inference Optimization:** Provide an environment config where `device='cuda'` can be leveraged. Use an official PyTorch CUDA base image (e.g., `pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime`) in your backend Dockerfile. This ensures models detect the GPU and achieve significantly faster inference times at scale.
