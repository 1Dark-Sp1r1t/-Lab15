const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// Роздаємо статичні файли (index.html, css, js) з поточної папки
app.use(express.static(__dirname));

// РІВНО 5 ЛОКАЛЬНИХ ПИТАНЬ (як заявлено у звіті)
const localQuestions = [
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
  },
  {
    category: "Film",
    type: "multiple",
    difficulty: "hard",
    question: "Who directed the movie 'Inception'?",
    correct_answer: "Christopher Nolan",
    incorrect_answers: ["Steven Spielberg", "Quentin Tarantino", "Martin Scorsese"]
  },
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "medium",
    question: "Which planet is known as the Red Planet?",
    correct_answer: "Mars",
    incorrect_answers: ["Venus", "Jupiter", "Saturn"]
  }
];

// Ендпоінт для отримання питань
app.get('/api/questions', (req, res) => {
  res.json({ response_code: 0, results: localQuestions });
});

// ОБРОБНИК ДЛЯ БУДЬ-ЯКОГО НЕІСНУЮЧОГО ШЛЯХУ (Універсальна 404 помилка)
app.use((req, res) => {
  res.status(404).json({ error: "Ресурс не знайдено" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
});