# IntelliML Platform 🧠📊🤖

**IntelliML** is an AI-powered analytics platform that revolutionizes data science workflows. Featuring an intelligent AI assistant, automated machine learning capabilities, and a stunning warm retro-themed interface, it enables both beginners and experts to perform sophisticated data analysis through natural language.

![IntelliML Landing Page](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_landing_ 1770676653677.png)

---

## ✨ Key Features

### 🤖 **AI-Powered Data Assistant**
- **Natural Language Queries**: Ask questions about your data in plain English
- **Code Generation**: Automatically generates Python code for data analysis tasks
- **Interactive Visualizations**: Creates matplotlib visualizations on-demand
- **Collapsible Code Blocks**: Clean interface with code hidden by default
- **Copy-to-Clipboard**: Easy code sharing with instant feedback

![AI Assistant with Visualization](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_ai_assistant_1770676863186.png)

### 🧹 **Intelligent Data Cleaning**
- **Missing Value Detection**: Automatic identification and handling
- **Multiple Imputation Methods**: Mean, Median, Mode, Zero, Forward Fill, Backward Fill
- **Outlier Detection**: IQR-based anomaly detection with visualization
- **Column Management**: Easy deletion of unwanted features

![Data Cleaning Interface](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_data_cleaning_1770676712535.png)

### 📊 **Exploratory Data Analysis (EDA)**
- **Statistical Summaries**: Comprehensive dataset statistics
- **Distribution Analysis**: Histograms and density plots
- **Correlation Heatmaps**: Visualize feature relationships
- **Missing Data Visualization**: Identify data quality issues

![EDA Dashboard](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_eda_1770676721347.png)

### ⚙️ **Feature Engineering**
- **Data Scaling**: StandardScaler and MinMaxScaler support
- **Encoding**: One-Hot and Label encoding for categorical variables
- **Custom Transformations**: Build advanced feature pipelines
- **Real-time Preview**: See transformations before applying

![Feature Engineering Tools](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_feature_engineering_1770676733292.png)

### 🎯 **Automated Machine Learning (AutoML)**
- **Multiple Algorithms**: Random Forest, XGBoost, LightGBM, Logistic Regression
- **Auto-Tuning**: Intelligent hyperparameter optimization
- **Model Comparison**: Side-by-side performance metrics
- **Explainable AI**: SHAP integration for model interpretability

### 🎨 **Modern Design**
- **Warm Retro Theme**: Elegant amber, cream, and burgundy color palette
- **Responsive Layout**: Works seamlessly on all screen sizes
- **Smooth Animations**: Delightful user experience with subtle motion
- **Accessibility**: High contrast and readable typography

![Dashboard Overview](file:///Users/ani7/.gemini/antigravity/brain/43454023-7e9c-4fc2-b94d-36d927ec44f0/readme_dashboard_1770676664447.png)

---

## 🏗️ Architecture & Tech Stack

### **Frontend** (`/frontend`)
- **Framework**: [Next.js 14](https://nextjs.org/) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Custom-built with shadcn/ui primitives
- **Charts**: Recharts for data visualization
- **State Management**: React Hooks & Context API

### **Backend** (`/backend`)
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ML Libraries**: Scikit-learn, XGBoost, LightGBM
- **Data Processing**: Pandas, NumPy
- **AI Integration**: Groq API (Llama 3.3 70B)
- **Visualization**: Matplotlib with base64 encoding

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **Groq API Key** - Get yours at [console.groq.com](https://console.groq.com)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/IntelliML-Platform.git
cd IntelliML-Platform
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
echo "GROQ_API_KEY=your_api_key_here" > .env

# Run the backend server
python run.py
```

The backend will start on `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access IntelliML.

---

## 📂 Project Structure

```
IntelliML-Platform/
├── backend/
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   │   ├── chat.py       # AI Assistant endpoints
│   │   │   ├── data.py       # Data processing endpoints
│   │   │   └── ml.py         # ML training endpoints
│   │   ├── services/         # Business logic
│   │   │   ├── data_chat_service.py   # AI chat with code execution
│   │   │   ├── groq_client.py         # Groq API integration
│   │   │   └── ml_service.py          # Model training service
│   │   ├── config.py         # Application configuration
│   │   └── main.py           # FastAPI entry point
│   ├── requirements.txt      # Python dependencies
│   └── run.py               # Server launcher
│
├── frontend/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Main dashboard
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles + animations
│   ├── components/
│   │   ├── landing/         # Landing page components
│   │   ├── chat/            # AI Assistant UI
│   │   ├── data/            # Data cleaning & EDA
│   │   └── ml/              # ML training components
│   ├── lib/
│   │   └── api.ts           # API client utilities
│   └── public/              # Static assets
│
└── README.md               # You are here!
```

---

## 🔌 API Documentation

Full interactive API documentation powered by Swagger UI:

👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Key Endpoints

#### AI Assistant
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/suggestions` - Get visualization suggestions
- `POST /api/chat/clear` - Clear chat history

#### Data Processing
- `POST /api/data/upload` - Upload CSV dataset
- `GET /api/data/health` - Get data quality report
- `POST /api/data/clean` - Apply data cleaning operations
- `POST /api/data/transform` - Feature engineering transformations

#### Machine Learning
- `POST /api/ml/train` - Train ML model
- `GET /api/ml/models` - List available models
- `POST /api/ml/explain` - Generate SHAP explanations

---

## � Usage Examples

### Using the AI Assistant
1. Upload your CSV dataset
2. Navigate to the "AI Assistant" tab
3. Ask questions like:
   - "Show me a correlation heatmap"
   - "Create a histogram of all numeric columns"
   - "What are the most important features?"
4. The AI generates code, executes it, and displays visualizations

### Training a Model
1. Clean your data in the "Data Cleaning" tab
2. Engineer features in "Feature Engineering"
3. Go to "Train" and select:
   - Target variable
   - ML algorithm (Random Forest, XGBoost, etc.)
   - Hyperparameters
4. View results with metrics and visualizations

---

## 🎯 Roadmap

- [ ] **Model Deployment**: One-click model export and API generation
- [ ] **Advanced Visualizations**: Plotly integration for interactive charts
- [ ] **Team Collaboration**: Share datasets and models with teammates
- [ ] **AutoML Pipelines**: Save and reuse complete ML workflows
- [ ] **Custom Models**: Upload and integrate your own models
- [ ] **Real-time Predictions**: Live inference on streaming data

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🐛 Known Issues

- **Download Button**: Some browsers may block automatic downloads from localhost. Check your browser's download permissions if visualizations don't download.
- **Groq API Rate Limits**: Free tier has daily token limits. Upgrade to Pro for higher limits.

---

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Groq** for providing lightning-fast LLM inference
- **Next.js** team for the amazing React framework
- **FastAPI** for the elegant Python backend framework
- **Tailwind CSS** for the utility-first CSS framework
- **shadcn/ui** for beautiful component primitives

---

## 📧 Contact

For questions, suggestions, or collaborations:
- **GitHub**: [yourusername](https://github.com/yourusername)
- **Email**: your.email@example.com

---

<div align="center">

**Built with ❤️ using Next.js, FastAPI, and Groq AI**

[⭐ Star this repo](https://github.com/yourusername/IntelliML-Platform) if you find it helpful!

</div>
