console.log('script.js підключено: Робота з Vue 3 та IndexedDB');

const API_URL = 'http://localhost:3000/api/questions';

const DB_NAME = 'QuizDB';
const DB_VERSION = 1;
const STORE_NAME = 'results';

// Читання зі старого localStorage (Крок 2)
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('quizResults');
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Пошкоджені дані в localStorage:', error);
    return [];
  }
}

// Відкриття/створення IndexedDB (Крок 6)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Згідно з варіантом 8: створюємо сховище з autoIncrement id
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Додавання результату в IndexedDB (Крок 7)
async function addResult(resultItem) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(resultItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Отримання всіх результатів з IndexedDB (Крок 7)
async function getAllResults() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Одноразова міграція з localStorage в IndexedDB (Крок 8)
async function migrateIfNeeded() {
  const isMigrated = localStorage.getItem('migratedToIDB');
  if (!isMigrated) {
    const oldData = loadFromLocalStorage();
    if (oldData.length > 0) {
      console.log('Знайдено старі дані в localStorage, починаємо міграцію...');
      for (const item of oldData) {
        await addResult(item);
      }
      console.log('Дані успішно мігровано в IndexedDB!');
    }
    localStorage.setItem('migratedToIDB', 'true'); // Ставимо прапорець
  }
}

function decodeHTML(str) {
  if (!str) return '';
  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'"
  };
  return String(str).replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;/g, (m) => map[m]);
}

const QuizQuestion = {
  name: 'QuizQuestion',
  props: ['question', 'options', 'correctAnswer', 'hasAnswered', 'selectedAnswer'],
  emits: ['answer', 'timeout'],
  template: `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 id="question-text" style="margin: 0;">{{ question }}</h2>
        
        <!-- Крок 3: Canvas для анімації таймера -->
        <canvas ref="timerCanvas" width="50" height="50" style="margin-left: 15px; flex-shrink: 0;"></canvas>
      </div>
      
      <form @submit.prevent>
        <div id="options-container">
          <div v-for="(option, index) in options" :key="index" style="margin-bottom: 10px;">
            <input 
              type="radio" 
              :id="'option-'+index" 
              name="quiz-option" 
              :value="option" 
              :checked="selectedAnswer === option"
              :disabled="hasAnswered"
              @change="$emit('answer', option)" 
              required>
            <label 
              :for="'option-'+index"
              :class="{
                'correct-answer': hasAnswered && option === correctAnswer,
                'wrong-answer': hasAnswered && option === selectedAnswer && option !== correctAnswer
              }"
            >
              {{ option }}
            </label>
          </div>
        </div>
      </form>
    </div>
  `,
  data() {
    return {
      timeLimit: 15000, // 15 секунд на відповідь
      startTime: null,
      animationId: null
    };
  },
  mounted() {
    // Запускаємо таймер при появі компонента
    this.startTimer();
  },
  unmounted() {
    // Крок 8: Коректне завершення (очищаємо пам'ять при знищенні компонента)
    this.stopTimer();
  },
  watch: {
    // Якщо прийшло нове питання — перезапускаємо таймер
    question() {
      this.startTimer();
    },
    // Крок 6: Якщо користувач відповів — зупиняємо анімацію
    hasAnswered(newVal) {
      if (newVal) this.stopTimer();
    }
  },
  methods: {
    startTimer() {
      this.stopTimer(); 
      this.startTime = Date.now();
      this.drawTimer(); // Запуск циклу малювання
    },
    stopTimer() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },
    // Крок 4-5: Функція відображення та цикл анімації
    drawTimer() {
      const canvas = this.$refs.timerCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const elapsed = Date.now() - this.startTime;
      let progress = elapsed / this.timeLimit;
      
      // Якщо час вийшов
      if (progress >= 1) {
        progress = 1;
        this.stopTimer();
        if (!this.hasAnswered) {
          this.$emit('timeout'); // Повідомляємо головний компонент
        }
      }

      // Крок 5: Обов'язкове очищення перед кожним кадром
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      const radius = 20;
      const startAngle = -Math.PI / 2; // Починаємо малювати згори (на 12 годин)
      const endAngle = startAngle + (2 * Math.PI * (1 - progress)); // Дуга зменшується

      // Фонове сіре кільце таймера
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Активна кольорова дуга
      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      // Якщо залишилося менше 30% часу — робимо дугу червоною
      ctx.strokeStyle = (1 - progress) < 0.3 ? '#ff3b30' : 'var(--primary-color, #6200ea)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Текст із секундами в центрі
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = 'var(--text-color, #333)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const secondsLeft = Math.ceil((this.timeLimit - elapsed) / 1000);
      ctx.fillText(secondsLeft > 0 ? secondsLeft : 0, x, y);

      // Продовжуємо цикл анімації, якщо гра триває
      if (progress < 1 && !this.hasAnswered) {
        this.animationId = requestAnimationFrame(this.drawTimer);
      }
    }
  }
};

// ==========================================
// КЛІЄНТСЬКА МАРШРУТИЗАЦІЯ (SPA Router)
// ==========================================

// Крок 3: Опис таблиці маршрутів
const routes = [
  { path: '/', view: 'Home' },
  { path: '/quiz', view: 'Quiz' },
  { path: '/results', view: 'Results' },
  { path: '/results/:id', view: 'ResultDetail' } // Маршрут з параметром
];

// Крок 4: Функція зіставлення поточного шляху з патерном
function matchRoute(path) {
  const pathParts = path.split('/').filter(Boolean);
  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;
    
    const params = {};
    const isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[i];
        return true;
      }
      return part === pathParts[i];
    });
    
    if (isMatch) return { view: route.view, params };
  }
  return null; // маршрут не знайдено (для 404)
}

const app = Vue.createApp({
  components: { QuizQuestion },
  data() {
    return {
      // Стан роутера
      currentPath: window.location.hash.slice(1) || '/',
      currentView: 'Home',
      routeParams: {},
      selectedResult: null,

      // Стан вікторини
      quizQuestions: [],
      currentQuestionIndex: 0,
      correctCount: 0,
      isLoading: false,
      errorMessage: '',
      quizStarted: false,
      quizFinished: false,
      hasAnswered: false,
      selectedAnswer: null,
      isCorrect: false,
      
      resultsHistory: []
    };
  },
  computed: {
    currentQuestion() { return this.quizQuestions[this.currentQuestionIndex]; },
    progressPercentage() {
      if (this.quizQuestions.length === 0) return 0;
      return ((this.currentQuestionIndex + 1) / this.quizQuestions.length) * 100;
    }
  },
  async mounted() {
    // Крок 7: Відстеження зміни хеша в адресному рядку браузера
    window.addEventListener('hashchange', this.handleRouting);
    this.handleRouting(); // Ініціалізуємо поточний маршрут при завантаженні
    
    try {
      await migrateIfNeeded();
      await this.loadHistory();
    } catch (error) {
      console.error('Помилка ініціалізації БД:', error);
    }
  },
  methods: {
    // Головна функція роутера, що змінює вигляд застосунку
    async handleRouting() {
      this.currentPath = window.location.hash.slice(1) || '/';
      const match = matchRoute(this.currentPath); // Крок 4
      
      if (match) {
        this.currentView = match.view;
        this.routeParams = match.params;
        
        // Крок 8: Якщо перейшли на сторінку деталей, завантажуємо потрібний результат
        if (this.currentView === 'ResultDetail') {
          await this.loadHistory();
          this.selectedResult = this.resultsHistory.find(r => r.id == this.routeParams.id);
        }
      } else {
        // Крок 9: Якщо шлях не знайдено — показуємо 404
        this.currentView = 'NotFound';
      }
    },

    startNewGame() {
      // Програмний перехід на сторінку вікторини
      window.location.hash = '/quiz';
      this.quizStarted = false;
      this.quizFinished = false;
      this.currentQuestionIndex = 0;
      this.correctCount = 0;
      this.loadData();
    },

    async loadData() {
      this.isLoading = true;
      this.errorMessage = '';
      this.quizQuestions = [];
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Помилка сервера: ${response.status}`);
        const data = await response.json();
        if (!data.results || data.results.length === 0) throw new Error('Немає питань.');

        this.quizQuestions = data.results.map(item => {
          const allOptions = [...item.incorrect_answers, item.correct_answer];
          allOptions.sort(() => Math.random() - 0.5);
          return {
            question: decodeHTML(item.question),
            options: allOptions.map(decodeHTML),
            answer: decodeHTML(item.correct_answer)
          };
        });

        this.quizStarted = true;
        this.resetQuestionState();
      } catch (error) {
        this.errorMessage = 'Не вдалося завантажити питання.';
      } finally {
        this.isLoading = false;
      }
    },
    
    checkAnswer(answer) {
      this.selectedAnswer = answer;
      this.hasAnswered = true;
      if (this.selectedAnswer === this.currentQuestion.answer) {
        this.isCorrect = true;
        this.correctCount++;
      } else {
        this.isCorrect = false;
      }
    },

    nextQuestion() {
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.quizQuestions.length) {
        this.resetQuestionState();
      } else {
        this.finishQuiz();
      }
    },

    resetQuestionState() {
      this.hasAnswered = false;
      this.selectedAnswer = null;
      this.isCorrect = false;
    },

    async finishQuiz() {
      this.quizFinished = true;
      const newResult = {
        date: new Date().toLocaleString('uk-UA'),
        score: this.correctCount,
        total: this.quizQuestions.length
      };

      try {
        await addResult(newResult);
        await this.loadHistory();
        // Після завершення вікторини автоматично перекидаємо на сторінку результатів!
        window.location.hash = '/results'; 
      } catch (error) {
        console.error('Помилка запису в IndexedDB:', error);
      }
    },

    async loadHistory() {
      try {
        const data = await getAllResults();
        this.resultsHistory = data.sort((a, b) => b.score - a.score);
      } catch (error) {
        console.error('Помилка читання з IndexedDB:', error);
      }
    }
  }
});

app.mount('#app');