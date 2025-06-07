const grid = document.getElementById('sudoku-grid');
const toggleBtn = document.getElementById('toggle-notes');
const validateBtn = document.getElementById('validate');
const solveBtn = document.getElementById('solve');
const resetBtn = document.getElementById('reset');
const generateBtn = document.getElementById('generate');
const difficultySelect = document.getElementById('difficulty');
const status = document.getElementById('status');
const timerEl = document.getElementById('timer');
const themeBtn = document.getElementById('toggle-theme');

let notesMode = false;
let cells = [];
let startTime;
let timerInterval;

toggleBtn.onclick = () => {
  notesMode = !notesMode;
  toggleBtn.textContent = `Aantekeningen: ${notesMode ? 'Aan' : 'Uit'}`;
};

themeBtn.onclick = () => {
  document.body.classList.toggle('dark');
};

function createGrid() {
  clearInterval(timerInterval);
  startTimer();

  grid.innerHTML = '';
  cells = [];

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 9;
    input.dataset.index = i;

    input.addEventListener('input', (e) => {
      let val = e.target.value;
      highlightSame(val);
      if (notesMode) {
        val = val.replace(/[^1-9]/g, '');
        const unique = [...new Set(val.split(''))].sort().join('');
        e.target.value = unique;
        cell.classList.add('notes');
      } else {
        if (!/^[1-9]$/.test(val)) e.target.value = '';
        cell.classList.remove('notes');
        saveState();
      }
    });

    input.addEventListener('focus', () => highlightSame(input.value));
    cell.appendChild(input);
    grid.appendChild(cell);
    cells.push(input);
  }

  loadState();
}

function getGridValues() {
  return cells.map(c => c.classList.contains('notes') ? 0 : parseInt(c.value) || 0);
}

function setGridValues(values) {
  for (let i = 0; i < 81; i++) {
    if (values[i] === 0) {
      cells[i].value = '';
    } else {
      cells[i].value = values[i];
    }
    cells[i].parentElement.classList.remove('notes', 'invalid');
  }
}

function validateGrid() {
  const values = getGridValues();
  let valid = true;
  cells.forEach(cell => cell.parentElement.classList.remove('invalid'));

  const checkSet = (indices) => {
    let seen = new Set();
    for (let i of indices) {
      let val = values[i];
      if (val !== 0) {
        if (seen.has(val)) {
          cells[i].parentElement.classList.add('invalid');
          valid = false;
        }
        seen.add(val);
      }
    }
  };

  for (let r = 0; r < 9; r++) {
    checkSet(Array.from({ length: 9 }, (_, i) => r * 9 + i));
  }
  for (let c = 0; c < 9; c++) {
    checkSet(Array.from({ length: 9 }, (_, i) => i * 9 + c));
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      let box = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          box.push((br * 3 + r) * 9 + (bc * 3 + c));
        }
      }
      checkSet(box);
    }
  }

  status.textContent = valid ? '✅ Geen fouten gevonden' : '❌ Er zitten fouten in het bord';
  return valid;
}

function isValid(values, index, num) {
  const row = Math.floor(index / 9);
  const col = index % 9;

  for (let i = 0; i < 9; i++) {
    if (values[row * 9 + i] === num || values[i * 9 + col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (values[(boxRow + r) * 9 + (boxCol + c)] === num) return false;
    }
  }
  return true;
}

function solveSudoku(values, index = 0) {
  if (index >= 81) return values;

  if (values[index] !== 0) return solveSudoku(values, index + 1);

  for (let num = 1; num <= 9; num++) {
    if (isValid(values, index, num)) {
      values[index] = num;
      const solved = solveSudoku(values, index + 1);
      if (solved) return solved;
      values[index] = 0;
    }
  }
  return null;
}

solveBtn.onclick = () => {
  let values = getGridValues();
  const solution = solveSudoku([...values]);
  if (solution) {
    setGridValues(solution);
    status.textContent = '✅ Sudoku opgelost!';
  } else {
    status.textContent = '❌ Geen oplossing mogelijk';
  }
};

resetBtn.onclick = () => {
  createGrid();
  status.textContent = '';
};

validateBtn.onclick = () => validateGrid();

generateBtn.onclick = () => {
  const puzzle = generatePuzzle(difficultySelect.value);
  setGridValues(puzzle);
  status.textContent = '🧩 Nieuwe puzzel geladen';
  saveState();
};

function generatePuzzle(difficulty) {
  const base = Array(81).fill(0);
  let count = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 10;
  while (count--) {
    let i = Math.floor(Math.random() * 81);
    let n = Math.floor(Math.random() * 9) + 1;
    if (base[i] === 0) base[i] = n;
  }
  return base;
}

function highlightSame(value) {
  cells.forEach(cell => {
    cell.parentElement.classList.remove('highlight');
    if (cell.value === value && value !== '') {
      cell.parentElement.classList.add('highlight');
    }
  });
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    const min = String(Math.floor(diff / 60)).padStart(2, '0');
    const sec = String(diff % 60).padStart(2, '0');
    timerEl.textContent = `⏱️ ${min}:${sec}`;
  }, 1000);
}

function saveState() {
  const state = getGridValues();
  localStorage.setItem('sudoku-state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('sudoku-state');
  if (saved) {
    setGridValues(JSON.parse(saved));
  }
}

createGrid();