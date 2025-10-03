import React, { useState } from 'react';
import { jsPDF } from "jspdf";

const MCQGenerator = () => {
    const [topic, setTopic] = useState("");
    const [count, setCount] = useState(5);
    const [mcqs, setMcqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [difficulty, setDifficulty] = useState('Medium');
    const [isPracticeMode, setIsPracticeMode] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});

    const validMcqs = mcqs.filter(mcq => mcq && mcq.question && mcq.options && mcq.answer);

    const displayMcqsProgressively = (mcqArray) => {
        const validMcqArray = mcqArray.filter(item => {
            const isValid = item && item.question && item.options && item.answer;
            if (!isValid) console.warn("Skipped invalid MCQ:", item);
            return isValid;
        });

        let index = 0;
        const interval = setInterval(() => {
            if (index < validMcqArray.length) {
                setMcqs(prev => [...prev, validMcqArray[index]]);
                index++;
            } else {
                clearInterval(interval);
            }
        }, 100);
    };

    const generateMCQs = async () => {
        if (count > 100) {
            setError("You can generate a maximum of 100 questions at a time.");
            return;
        }
        if (!topic.trim()) {
            setError("Please enter a topic.");
            return;
        }

        setLoading(true);
        setMcqs([]);
        setUserAnswers({});
        setError(null);

        const prompt = `
            Generate exactly ${count} multiple-choice questions on the topic "${topic}" with a difficulty level of "${difficulty}".
            Respond ONLY with a valid raw JSON array of objects, without markdown or explanation.
            Each MCQ must include:
            {
              "question": "string",
              "options": {
                "A": "string",
                "B": "string",
                "C": "string",
                "D": "string"
              },
              "answer": "A"
            }
        `;

        try {
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            if (!apiKey) throw new Error("API key missing. Set REACT_APP_GEMINI_API_KEY in your .env file.");

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            };

            const maxRetries = 3;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const result = await response.json();
                    let raw = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (!raw) throw new Error("Empty response from Gemini API.");

                    if (raw.startsWith("```")) {
                        raw = raw.replace(/```json|```/gi, '').trim();
                    }

                    const start = raw.indexOf('[');
                    const end = raw.lastIndexOf(']');
                    if (start !== -1 && end !== -1 && end > start) {
                        const jsonString = raw.substring(start, end + 1);
                        try {
                            const parsedJson = JSON.parse(jsonString);
                            displayMcqsProgressively(parsedJson);
                            return;
                        } catch (jsonErr) {
                            console.error("JSON parse error:", jsonErr);
                            throw new Error("Could not parse Gemini's response. Try again.");
                        }
                    } else {
                        console.error("No JSON array found in:", raw);
                        throw new Error("The API response did not contain a valid JSON array.");
                    }
                }

                if ([429, 500, 503].includes(response.status)) {
                    if (attempt < maxRetries - 1) {
                        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
                        continue;
                    }
                } else {
                    const errorBody = await response.json();
                    throw new Error(`API Error: ${errorBody.error?.message || response.statusText}`);
                }
            }

            throw new Error("Gemini API failed after retries.");

        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (validMcqs.length === 0) return;

        const doc = new jsPDF();
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = margin;

        const addText = (text, x, yPos, options = {}) => {
            const splitText = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin * 2);
            if (y + (splitText.length * 7) > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(splitText, x, y, options);
            return y + (splitText.length * 7);
        };

        doc.setFont("helvetica", "bold");
        y = addText(`MCQs on: ${topic}`, margin, y);
        y += 5;

        validMcqs.forEach((mcq, i) => {
            doc.setFont("helvetica", "bold");
            y = addText(`Q${i + 1}: ${mcq.question}`, margin, y);
            y += 2;
            doc.setFont("helvetica", "normal");

            Object.entries(mcq.options).forEach(([key, optionText]) => {
                const isCorrect = key === mcq.answer;
                if (isCorrect) doc.setFont("helvetica", "bold");
                y = addText(`${isCorrect ? "✔ " : ""}${key}) ${optionText}`, margin + 5, y);
                if (isCorrect) doc.setFont("helvetica", "normal");
                y += 1;
            });

            if (isPracticeMode && userAnswers[i]) {
                const ua = userAnswers[i];
                const correct = ua === mcq.answer;
                y = addText(`Your Answer: ${ua} (${correct ? "Correct" : "Incorrect"})`, margin + 5, y);
            }

            y += 8;
        });

        doc.save(`${topic.replace(/\s+/g, '_')}-mcqs.pdf`);
    };

    const handleCountChange = (e) => {
        const value = parseInt(e.target.value, 10) || 1;
        if (value > 100) setError("Cannot generate more than 100 questions.");
        else setError(null);
        setCount(value);
    };

    const handleOptionClick = (questionIndex, selectedOptionKey) => {
        if (!isPracticeMode) return;
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: selectedOptionKey
        }));
    };

    return (
        <div className="container">
            <header>
                <h1>MCQ Generator</h1>
            </header>

            <div className="form-container">
                <div className="input-group">
                    <label htmlFor="topic">Topic</label>
                    <input type="text" id="topic" placeholder="Enter topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
                </div>
                <div className="input-group">
                    <label htmlFor="difficulty">Difficulty</label>
                    <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>
                <div className="input-group">
                    <label htmlFor="count">Questions</label>
                    <input type="number" id="count" value={count} onChange={handleCountChange} min="1" max="100" />
                </div>
                <button 
                    onClick={generateMCQs} 
                    disabled={loading || !topic.trim() || count < 1 || count > 100}
                >
                    {loading ? 'Generating...' : 'Generate'}
                </button>
            </div>

            {loading && <div className="loader">Generating... Please wait.</div>}
            {error && <div className="error-message">{error}</div>}
            

            {validMcqs.length > 0 && (
                <div className="results-container">
                    <div className="results-header">
                        <h2>Generated Questions</h2>
                        <div className="controls-group">
                            <label className="switch">
                                Practice Mode
                                <input type="checkbox" checked={isPracticeMode} onChange={() => setIsPracticeMode(!isPracticeMode)} />
                            </label>
                            <button onClick={downloadPDF} className="pdf-button">Download PDF</button>
                        </div>
                    </div>

                    {isPracticeMode && (
                        <p className="score-display">
                            Score: {
                                Object.entries(userAnswers).filter(([i, ans]) => {
                                    const mcq = validMcqs[i];
                                    return mcq && mcq.answer === ans;
                                }).length
                            } / {validMcqs.length}
                        </p>
                    )}

                    <div className="mcq-list">
                        {validMcqs.map((mcq, i) => (
                            <div key={i} className="mcq-item">
                                <h3>{i + 1}. {mcq.question}</h3>
                                <ul className="options-list">
                                    {Object.entries(mcq.options).map(([key, optionText]) => {
                                        const isCorrect = key === mcq.answer;
                                        const userAnswer = userAnswers[i];
                                        let practiceClass = '';

                                        if (isPracticeMode && userAnswer) {
                                            if (isCorrect) practiceClass = 'practice-correct';
                                            else if (key === userAnswer) practiceClass = 'practice-incorrect';
                                        }

                                        return (
                                            <li
                                                key={key}
                                                className={`${!isPracticeMode && isCorrect ? 'correct-answer' : ''} ${practiceClass}`}
                                                onClick={() => handleOptionClick(i, key)}
                                            >
                                                <strong>
                                                    {(!isPracticeMode || userAnswer) && isCorrect ? '✔ ' : ''}
                                                    {key})
                                                </strong> {optionText}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MCQGenerator;
