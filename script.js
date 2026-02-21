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
let timerInterval;
let elapsedSeconds = 0;

// Verbetering 10: themaknop toont correct label afhankelijk van huidige modus
themeBtn.onclick = () => {
  const isDark = document.body.classList.toggle('dark');
  themeBtn.textContent = isDark ? '☀️ Lichte modus' : '🌙 Donkere modus';
};

toggleBtn.onclick = () => {
  notesMode = !notesMode;
  toggleBtn.textContent = `Aantekeningen: ${notesMode ? 'Aan' : 'Uit'}`;
};

function createGrid(loadSaved = true) {
  clearInterval(timerInterval);
  grid.innerHTML = '';
  cells = [];

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');

    // Verbetering 5: klassen voor dikke grenzen rond 3×3-vakken
    const row = Math.floor(i / 9);
    const col = i % 9;
    if (col === 2 || col === 5) cell.classList.add('box-right');
    if (row === 2 || row === 5) cell.classList.add('box-bottom');

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 9;
    input.dataset.index = i;

    input.addEventListener('input', (e) => {
      if (e.target.readOnly) return;
      let val = e.target.value;
      if (notesMode) {
        val = val.replace(/[^1-9]/g, '');
        const unique = [...new Set(val.split(''))].sort().join('');
        e.target.value = unique;
        cell.classList.add('notes');
        saveState();
      } else {
        if (!/^[1-9]$/.test(val)) e.target.value = '';
        cell.classList.remove('notes');
        saveState();
        checkWin(); // Verbetering 7
      }
      highlightSame(e.target.value);
    });

    // Verbetering 9: wis highlights bij blur
    input.addEventListener('focus', () => highlightSame(input.value));
    input.addEventListener('blur', () => clearHighlights());

    // Verbetering 8: pijltjestoets-navigatie
    input.addEventListener('keydown', (e) => {
      const idx = parseInt(e.target.dataset.index);
      let next = -1;
      if (e.key === 'ArrowRight') next = idx + 1;
      else if (e.key === 'ArrowLeft') next = idx - 1;
      else if (e.key === 'ArrowDown') next = idx + 9;
      else if (e.key === 'ArrowUp') next = idx - 9;
      if (next >= 0 && next < 81) {
        e.preventDefault();
        cells[next].focus();
      }
    });

    cell.appendChild(input);
    grid.appendChild(cell);
    cells.push(input);
  }

  if (loadSaved) {
    const loaded = loadState();
    startTimer(loaded ? loaded.elapsed : 0);
  } else {
    startTimer(0);
  }
}

function getGridValues() {
  return cells.map(c => c.parentElement.classList.contains('notes') ? 0 : parseInt(c.value) || 0);
}

// Verbetering 6: markGiven maakt puzzelcellen readonly met visueel onderscheid
function setGridValues(values, markGiven = false) {
  for (let i = 0; i < 81; i++) {
    const cell = cells[i].parentElement;
    cell.classList.remove('notes', 'invalid', 'given');
    cells[i].readOnly = false;
    cells[i].value = values[i] !== 0 ? values[i] : '';
    if (markGiven && values[i] !== 0) {
      cell.classList.add('given');
      cells[i].readOnly = true;
    }
  }
}

// Verbetering 2: markeer BEIDE cellen van een duplicaat als invalid
function validateGrid() {
  const values = getGridValues();
  let valid = true;
  cells.forEach(c => c.parentElement.classList.remove('invalid'));

  const checkSet = (indices) => {
    const seen = new Map();
    const dupes = new Set();
    for (let i of indices) {
      const val = values[i];
      if (val !== 0) {
        if (seen.has(val)) {
          dupes.add(seen.get(val));
          dupes.add(i);
        } else {
          seen.set(val, i);
        }
      }
    }
    for (let i of dupes) {
      cells[i].parentElement.classList.add('invalid');
      valid = false;
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
      const box = [];
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

// Verbetering 1: genereer een compleet geldig bord met willekeurige volgorde
function generateSolution() {
  const values = Array(81).fill(0);
  function solve(index) {
    if (index >= 81) return true;
    if (values[index] !== 0) return solve(index + 1);
    const shuffled = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (let num of shuffled) {
      if (isValid(values, index, num)) {
        values[index] = num;
        if (solve(index + 1)) return true;
        values[index] = 0;
      }
    }
    return false;
  }
  solve(0);
  return values;
}

// Verbetering 13: correcte moeilijkheidsgraden (36/27/22 gegeven cijfers)
function generatePuzzle(difficulty) {
  const solution = generateSolution();
  const puzzle = [...solution];
  const clues = difficulty === 'easy' ? 36 : difficulty === 'medium' ? 27 : 22;
  const toRemove = 81 - clues;
  const indices = [...Array(81).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < toRemove; i++) {
    puzzle[indices[i]] = 0;
  }
  return puzzle;
}

function highlightSame(value) {
  cells.forEach(cell => {
    cell.parentElement.classList.remove('highlight');
    if (value !== '' && cell.value === value && !cell.parentElement.classList.contains('notes')) {
      cell.parentElement.classList.add('highlight');
    }
  });
}

function clearHighlights() {
  cells.forEach(c => c.parentElement.classList.remove('highlight'));
}

// Verbetering 7: windetectie
function checkWin() {
  const values = getGridValues();
  if (values.includes(0)) return;
  if (validateGrid()) {
    clearInterval(timerInterval);
    status.textContent = '🎉 Gefeliciteerd! Puzzel opgelost!';
  }
}

// Verbetering 5 (timer): herstel verstreken tijd bij laden
function startTimer(initialSeconds = 0) {
  elapsedSeconds = initialSeconds;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerDisplay();
    saveState();
  }, 1000);
}

function updateTimerDisplay() {
  const min = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const sec = String(elapsedSeconds % 60).padStart(2, '0');
  timerEl.textContent = `⏱️ ${min}:${sec}`;
}

// Verbetering 4: sla aantekeningen, gegeven-cellen én verstreken tijd op
function saveState() {
  const state = {
    cells: cells.map(c => ({
      value: c.value,
      isNotes: c.parentElement.classList.contains('notes'),
      isGiven: c.readOnly,
    })),
    elapsed: elapsedSeconds,
  };
  localStorage.setItem('sudoku-state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('sudoku-state');
  try {
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.cells && parsed.cells.length === 81) {
        for (let i = 0; i < 81; i++) {
          const { value, isNotes, isGiven } = parsed.cells[i];
          cells[i].value = value || '';
          cells[i].readOnly = isGiven || false;
          cells[i].parentElement.classList.toggle('notes', isNotes || false);
          cells[i].parentElement.classList.toggle('given', isGiven || false);
        }
        return { elapsed: parsed.elapsed || 0 };
      }
    }
  } catch (e) {
    console.warn('Ongeldige localStorage-waarde — resetten.');
    localStorage.removeItem('sudoku-state');
  }
  return null;
}

solveBtn.onclick = () => {
  const solution = solveSudoku([...getGridValues()]);
  if (solution) {
    setGridValues(solution);
    clearInterval(timerInterval);
    status.textContent = '✅ Sudoku opgelost!';
  } else {
    status.textContent = '❌ Geen oplossing mogelijk';
  }
};

// Verbetering 3: reset wist localStorage en laadt geen opgeslagen staat
resetBtn.onclick = () => {
  localStorage.removeItem('sudoku-state');
  createGrid(false);
  status.textContent = '';
};

validateBtn.onclick = () => validateGrid();

generateBtn.onclick = () => {
  const puzzle = generatePuzzle(difficultySelect.value);
  setGridValues(puzzle, true);
  clearInterval(timerInterval);
  startTimer(0);
  status.textContent = '🧩 Nieuwe puzzel geladen';
  saveState();
};

createGrid();
