const BOARD_SIZE = 15;
const boardElement = document.querySelector('#board');
const mode = document.body.dataset.mode || 'solo';
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
let current = 'black';
let gameOver = false;
let aiLearning = true;
const stats = { black: 0, white: 0 };

function createBoard() {
  if (!boardElement) return;
  boardElement.innerHTML = '';
  [3, 7, 11].forEach(y => [3, 7, 11].forEach(x => {
    const star = document.createElement('span'); star.className = 'star'; star.style.left = `${x / 14 * 100}%`; star.style.top = `${y / 14 * 100}%`; boardElement.appendChild(star);
  }));
  boardElement.addEventListener('click', handleBoardClick);
  render();
}
function handleBoardClick(event) {
  if (gameOver) return;
  const rect = boardElement.getBoundingClientRect();
  const x = Math.round((event.clientX - rect.left) / rect.width * 14);
  const y = Math.round((event.clientY - rect.top) / rect.height * 14);
  if (x < 0 || x > 14 || y < 0 || y > 14 || board[y][x]) return;
  placeStone(x, y, current);
  if (!gameOver && mode === 'ai' && current === 'white') window.setTimeout(aiMove, 360);
}
function placeStone(x, y, color) {
  if (board[y][x] || gameOver) return false;
  board[y][x] = color; stats[color]++; render();
  if (checkWin(x, y, color)) { gameOver = true; updateStatus(color === 'black' ? '흑돌의 승리입니다.' : '백돌의 승리입니다.'); return true; }
  current = color === 'black' ? 'white' : 'black'; updateTurn(); return true;
}
function render() {
  if (!boardElement) return;
  boardElement.querySelectorAll('.stone').forEach(stone => stone.remove());
  board.forEach((row, y) => row.forEach((color, x) => { if (color) { const stone = document.createElement('span'); stone.className = `stone ${color}`; stone.style.left = `${x / 14 * 100}%`; stone.style.top = `${y / 14 * 100}%`; stone.setAttribute('aria-label', `${color === 'black' ? '흑' : '백'} ${x + 1},${y + 1}`); boardElement.appendChild(stone); } }));
  const blackScore = document.querySelector('#black-score'); const whiteScore = document.querySelector('#white-score');
  if (blackScore) blackScore.textContent = stats.black; if (whiteScore) whiteScore.textContent = stats.white;
}
function checkWin(x, y, color) { return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => count(x,y,dx,dy,color) + count(x,y,-dx,-dy,color) - 1 >= 5); }
function count(x,y,dx,dy,color) { let total = 0; while (x >= 0 && x < 15 && y >= 0 && y < 15 && board[y][x] === color) { total++; x += dx; y += dy; } return total; }
function updateTurn() { updateStatus(`${current === 'black' ? '흑' : '백'}돌 차례입니다.`); const turn = document.querySelector('#turn-stone'); if(turn) turn.className = `mini-stone ${current}`; }
function updateStatus(text) { const status = document.querySelector('#game-status'); if(status) status.textContent = text; }
function resetGame() { board = Array.from({ length: 15 }, () => Array(15).fill(null)); current = 'black'; gameOver = false; stats.black = 0; stats.white = 0; updateTurn(); render(); }
function aiMove() {
  if (gameOver || current !== 'white') return;
  const empty = []; board.forEach((row,y) => row.forEach((cell,x) => { if(!cell) empty.push({x,y}); }));
  if (!empty.length) return;
  const preferred = empty.filter(({x,y}) => board[y].some(v => v) && board.some(row => row[x]));
  const move = (preferred.length ? preferred : empty)[Math.floor(Math.random() * (preferred.length || empty.length))];
  placeStone(move.x, move.y, 'white');
}
function toggleLearning() { aiLearning = !aiLearning; const label = document.querySelector('#learning-label'); const button = document.querySelector('#learning-toggle'); if(label) label.textContent = aiLearning ? '학습 중' : '학습 꺼짐'; if(button) button.classList.toggle('is-off', !aiLearning); }
createBoard();
document.querySelector('#reset-game')?.addEventListener('click', resetGame);
document.querySelector('#learning-toggle')?.addEventListener('click', toggleLearning);
