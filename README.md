# AI Data Analyst

An interactive web application that allows users to chat with an AI powered by Llama 3.1 to analyze CSV data and create visualizations.

## Features

- Chat interface with Llama 3.1 model
- CSV file upload and analysis
- Real-time data visualization
- Python code execution in a secure sandbox
- Modern, responsive UI

## Prerequisites

- Node.js 18+ installed
- E2B API key (get it from https://e2b.dev/docs)
- Groq API key (get it from https://console.groq.com/)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-data-analyst.git
cd ai-data-analyst
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your API keys:
```
E2B_API_KEY=your_e2b_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload your CSV files using the drag-and-drop interface
2. Chat with the AI about your data
3. Ask questions about your data or request visualizations
4. The AI will analyze your data and create visualizations in real-time

## Technology Stack

- Next.js 14 with TypeScript
- E2B Sandbox for secure code execution
- Groq AI with Llama 3.1 model
- Vercel AI SDK
- TailwindCSS for styling
- React Dropzone for file uploads

## License

MIT
 
