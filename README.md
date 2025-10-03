# mcq_generative_react

📌 React MCQ Generator (Gemini API)

A React-based web application that generates multiple-choice questions (MCQs) using the Gemini API. It is designed for self-learning and practice, allowing users to set difficulty levels and engage in interactive learning sessions.

🔑 Features:

MCQ Generation: Fetch dynamically generated questions with 4 options from Gemini API.

Difficulty Selection: Choose between Easy, Medium, or Hard levels before generating questions.

Practice Mode: Enable practice mode to attempt questions, select answers, and get immediate feedback.

Self-Learning Tool: Helps students practice aptitude, reasoning, or subject-specific questions.

Interactive UI: Clean and responsive interface built with React and TailwindCSS / shadcn-ui.

🛠️ Tech Stack:

Frontend: React.js

API: Google Gemini Generative Language API

State Management: React hooks (useState, useEffect)

⚡ How it Works:

User selects difficulty level.

Clicks Generate MCQ → app calls Gemini API.

API returns a question with multiple-choice options.

If Practice Mode is enabled, users can attempt answers and get feedback on correctness.

Repeat for unlimited practice.
