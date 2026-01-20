# EssayFlow AI - AI-Powered English Writing Assistant

<div align="center">

![EssayFlow AI](https://img.shields.io/badge/EssayFlow-AI-blue?style=for-the-badge)
![React 19](https://img.shields.io/badge/React-19.2.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=flat-square&logo=vite)

**An intelligent platform for handwriting OCR recognition and AI-powered English essay feedback**

[Features](#features) • [Quick Start](#quick-start) • [Project Structure](#project-structure) • [Configuration](#configuration)

</div>

---

## ✨ Features

### 🤖 AI-Powered Essay Grading
- Multi-model AI support (OpenAI, OpenRouter, and custom providers)
- Tailored feedback based on writing skills and proficiency levels
- Comprehensive scoring across multiple dimensions:
  - Content & Ideas
  - Organization & Structure
  - Language & Grammar
  - Vocabulary & Expression

### 📝 Handwriting OCR Recognition
- Support for multiple image formats
- Automatic text extraction from scanned essays
- Batch processing capability
- Recovery tools for corrupted documents

### 📊 Analytics Dashboard
- Track student progress over time
- Visualize performance metrics
- Class-level analytics and insights
- Exportable reports

### 📄 PDF Export
- Generate professional PDF reports
- Customizable export templates
- Include detailed feedback and suggestions
- Student-friendly formatting

### 💾 Data Persistence
- Local storage with persistence layer
- Automatic backup and recovery
- Import/Export functionality
- Markdown support for easy sharing

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **pnpm** package manager
- **API Keys** for AI providers (OpenAI, OpenRouter, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/CaoYuhaoCarl/ai-tailored-english-writing.git
cd ai-tailored-english-writing

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Configure your API keys in .env.local
```

### Environment Setup

Create a `.env.local` file with your API credentials:

```env
# OpenAI (required for AI grading)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter (optional alternative)
OPENROUTER_API_KEY=your_openrouter_api_key

# Other configurations
VITE_DEFAULT_MODEL=gpt-4
VITE_MAX_TOKENS=4000
```

### Running the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Start OCR server (if needed)
npm run ocr-server

# Recover OCR documents
npm run recover:ocr
```

---

## 📁 Project Structure

```
ai-tailored-english-writing/
├── src/
│   ├── components/           # React components
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── EssayCard.tsx
│   │   ├── Icons.tsx
│   │   ├── PDFExportModal.tsx
│   │   ├── PromptConfigPanel.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── Sidebar.tsx
│   │   └── UploadZone.tsx
│   ├── services/             # Business logic & API
│   │   ├── aiAgent.ts        # AI grading service
│   │   ├── config.ts         # Configuration management
│   │   ├── handwritingOcr.ts # OCR processing
│   │   ├── markdownImport.ts # Markdown import/export
│   │   ├── modelRegistry.ts  # Model provider registry
│   │   ├── persistence.ts    # Data persistence layer
│   │   └── promptDefaults.ts # Default prompt templates
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Main application component
│   ├── index.tsx             # Entry point
│   └── index.css             # Global styles
├── server/                   # Backend services
│   ├── ocr-save-server.js    # OCR document saving
│   └── recover-ocr-docs.js   # OCR recovery tools
├── docs/                     # Documentation
│   └── ARCHITECTURE.md       # Architecture documentation
├── public/                   # Static assets
├── .env.local               # Environment variables (local)
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── README.md                # This file
```

---

## ⚙️ Configuration

### AI Model Settings

Configure AI models in the Settings Panel:

| Model | Provider | Best For |
|-------|----------|----------|
| GPT-4 | OpenAI | Complex essays, detailed feedback |
| GPT-3.5-turbo | OpenAI | Faster processing, simple essays |
| Claude | Anthropic | Nuanced language feedback |
| Custom | Any OpenAI-compatible | Flexible deployment |

### Writing Skills

Available writing skills for tailored feedback:
- Argumentative Writing
- Narrative Writing
- Expository Writing
- Descriptive Writing
- Creative Writing
- Academic Writing

### Proficiency Levels

- **Beginner** (Grade 6-7)
- **Intermediate** (Grade 8-9)
- **Advanced** (Grade 10+)

---

## 📖 Usage Guide

### 1. Upload Student Essays

- Drag and drop images to Upload Zone
- Supported formats: JPG, PNG, PDF
- Batch upload multiple files

### 2. Configure Grading Parameters

- Select writing skill category
- Set proficiency level
- Adjust feedback detail level

### 3. AI Processing

- Automatic OCR text extraction
- AI analysis and scoring
- Detailed feedback generation

### 4. Review & Export

- Review AI feedback
- Add manual annotations
- Export to PDF
- Save to local storage

---

## 🔧 Development

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS 3
- **Icons**: Heroicons
- **PDF Generation**: html2pdf.js
- **Build Tool**: Vite
- **Type Safety**: TypeScript 5.8

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# OCR Services
npm run ocr-server       # Start OCR save server
npm run recover:ocr      # Run OCR recovery tool

# Type Checking
npx tsc --noEmit         # TypeScript validation
```

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Component-based architecture
- Functional components with hooks

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT models
- [Vite](https://vitejs.dev) for fast development
- [Tailwind CSS](https://tailwindcss.com) for styling
- [React](https://reactjs.org) for the UI framework

---

<div align="center">

**Made with ❤️ by CaoYuhaoCarl**

[GitHub](https://github.com/CaoYuhaoCarl) • [Report Issue](https://github.com/CaoYuhaoCarl/ai-tailored-english-writing/issues)

</div>
