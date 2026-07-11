const BOARD_SIZE = 15;
const boardElement = document.querySelector('#board');
const mode = document.body.dataset.mode || 'solo';
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
let current = 'black';
let gameOver = false;
let aiLearning = true;
let aiThinking = false;
const AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = 'gpt-4o-mini';
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
function resetGame() { board = Array.from({ length: 15 }, () => Array(15).fill(null)); current = 'black'; gameOver = false; aiThinking = false; stats.black = 0; stats.white = 0; updateTurn(); render(); }
function randomAiMove() {
  const empty = []; board.forEach((row,y) => row.forEach((cell,x) => { if(!cell) empty.push({x,y}); }));
  if (!empty.length) return null;
  const preferred = empty.filter(({x,y}) => board[y].some(v => v) && board.some(row => row[x]));
  return (preferred.length ? preferred : empty)[Math.floor(Math.random() * (preferred.length || empty.length))];
}
function boardForPrompt() { return board.map(row => row.map(cell => cell === 'black' ? 'B' : cell === 'white' ? 'W' : '.').join('')).join('/'); }
function getApiKey() { return localStorage.getItem('omokchrist_ai_api_key')?.trim() || ''; }
function setApiStatus(text, error = false) { const status = document.querySelector('#api-status'); if (status) { status.textContent = text; status.classList.toggle('error', error); } }
async function requestApiMove(apiKey) {
  const response = await fetch(AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: AI_MODEL, temperature: 0.4, max_tokens: 40, messages: [{ role: 'system', content: 'You are Jomok, a Gomoku AI. Return only JSON in the exact form {"x": number, "y": number}. Coordinates are zero-based from 0 to 14. Choose an empty legal move for White and try to make or block five in a row.' }, { role: 'user', content: `Board rows separated by /. B=black, W=white, .=empty. Current board: ${boardForPrompt()}` }] }) });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(content.match(/\{[^}]+\}/)?.[0] || content);
  if (!Number.isInteger(parsed.x) || !Number.isInteger(parsed.y) || parsed.x < 0 || parsed.x > 14 || parsed.y < 0 || parsed.y > 14 || board[parsed.y][parsed.x]) throw new Error('invalid move');
  return parsed;
}
async function aiMove() {
  if (gameOver || current !== 'white' || aiThinking) return;
  aiThinking = true; updateStatus('제이오목이 생각 중입니다…');
  let move = null; const apiKey = getApiKey();
  try { if (apiKey) { move = await requestApiMove(apiKey); setApiStatus('API 연결됨 · 제이오목이 수를 계산합니다.'); } }
  catch (error) { setApiStatus('API 연결에 실패해 기본 모드로 두었습니다.', true); }
  move ||= randomAiMove();
  aiThinking = false;
  if (move) placeStone(move.x, move.y, 'white');
}
function saveApiKey() { const input = document.querySelector('#ai-api-key'); const key = input?.value.trim(); if (!key) { localStorage.removeItem('omokchrist_ai_api_key'); setApiStatus('API 키를 지웠습니다. 키가 없으면 기본 모드로 작동합니다.'); return; } localStorage.setItem('omokchrist_ai_api_key', key); input.value = ''; setApiStatus('API 키 저장 완료 · 다음 AI 차례부터 사용합니다.'); }
function initApiKey() { const input = document.querySelector('#ai-api-key'); if (!input) return; if (getApiKey()) setApiStatus('API 키가 저장되어 있습니다.'); document.querySelector('#save-api-key')?.addEventListener('click', saveApiKey); input.addEventListener('paste', () => window.setTimeout(saveApiKey, 0)); input.addEventListener('keydown', event => { if (event.key === 'Enter') saveApiKey(); }); }
function toggleLearning() { aiLearning = !aiLearning; const label = document.querySelector('#learning-label'); const button = document.querySelector('#learning-toggle'); if(label) label.textContent = aiLearning ? '학습 중' : '학습 꺼짐'; if(button) button.classList.toggle('is-off', !aiLearning); }
createBoard();
initApiKey();
document.querySelector('#reset-game')?.addEventListener('click', resetGame);
document.querySelector('#learning-toggle')?.addEventListener('click', toggleLearning);
