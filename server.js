const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// Роздаємо статичні файли (index.html, css, js) з поточної папки
app.use(express.static(__dirname));

// Локальний масив питань, який замінює зовнішнє API
const localQuestions = [
  {
    category: "Hacking",
    type: "multiple",
    difficulty: "easy",
    // Ось наш XSS-вектор:
    question: "Test XSS: <img src=x onerror=\"alert('Увага! XSS Вразливість!')\">",
    correct_answer: "Yes",
    incorrect_answers: ["No", "Maybe", "I don't know"]
  },
  
  {
    category: "Science",
    type: "multiple",
    difficulty: "easy",
    question: "What is the chemical symbol for water?",
    correct_answer: "H2O",
    incorrect_answers: ["CO2", "O2", "NaCl"]
  },
  {
    category: "History",
    type: "multiple",
    difficulty: "medium",
    question: "In what year did the Titanic sink?",
    correct_answer: "1912",
    incorrect_answers: ["1905", "1915", "1920"]
  },
  {
    category: "Geography",
    type: "multiple",
    difficulty: "easy",
    question: "What is the capital of France?",
    correct_answer: "Paris",
    incorrect_answers: ["London", "Berlin", "Madrid"]
  }
  
];

// Ендпоінт для отримання питань (повертає JSON у форматі OpenTDB)
app.get('/api/questions', (req, res) => {
  res.json({ response_code: 0, results: localQuestions });
});

// Додатковий ендпоінт для демонстрації обробки помилок (для звіту)
app.get('/api/questions/error', (req, res) => {
    res.status(404).json({ error: "Не знайдено" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
});