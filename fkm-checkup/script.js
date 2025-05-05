// GASエンドポイントURL
const GAS_URL = 'https://fkm-checkup.netlify.app/.netlify/functions/proxy-gas';

// UI 状態
let currentIndex = 0;
let currentData = [];
let currentBatch = 1;

// DOM要素の取得
const loader            = document.getElementById('loader');
const mainContent       = document.getElementById('mainContent');
const card              = document.getElementById('card');
const productImage      = document.getElementById('productImage');
const productName       = document.getElementById('productName');
const personalColor     = document.getElementById('personalColor');
const bodyType          = document.getElementById('bodyType');
const productLink       = document.getElementById('productLink');
const likeBtn           = document.getElementById('likeBtn');
const dislikeBtn        = document.getElementById('dislikeBtn');
const skipBtn           = document.getElementById('skipBtn');
const editScreen        = document.getElementById('editScreen');
const completeScreen    = document.getElementById('completeScreen');
const errorType         = document.getElementById('errorType');
const colorCorrection   = document.getElementById('colorCorrection');
const bodyCorrection    = document.getElementById('bodyCorrection');
const submitCorrection  = document.getElementById('submitCorrection');
const continueBtn       = document.getElementById('continueBtn');
const finishBtn         = document.getElementById('finishBtn');
const actionButtons     = document.getElementById('actionButtons');

// ★ ローディング用プログレスバー
const loaderProgressBar  = document.getElementById('loaderProgressBar');
const loaderProgressText = document.getElementById('loaderProgressText');
// ★ データ進捗用プログレスバー
const dataProgressBar    = document.getElementById('dataProgressBar');
const dataProgressText   = document.getElementById('dataProgressText');

// イベントリスナー
likeBtn.addEventListener('click', handleLike);
dislikeBtn.addEventListener('click', handleDislike);
skipBtn.addEventListener('click', handleSkip);
submitCorrection.addEventListener('click', async () => await submitCorrectionData());
continueBtn.addEventListener('click', loadNextBatch);
finishBtn.addEventListener('click', () => window.close());
errorType.addEventListener('change', handleErrorTypeChange);

// 疑似ローディング（任意）
function fakeLoading() {
  return new Promise(resolve => {
    let sec = 0;
    const timer = setInterval(() => {
      sec++;
      const pct = (sec / 5) * 100;
      loaderProgressBar.style.width  = `${pct}%`;
      loaderProgressText.textContent = `${Math.round(pct)}%`;
      if (sec >= 5) {
        clearInterval(timer);
        resolve();
      }
    }, 1000);
  });
}

// 初期化
async function initialize() {
  // ローディング表示
  loader.style.display      = 'block';
  mainContent.style.display = 'none';

  // 疑似ローディング（不要なら外してください）
  await fakeLoading();

  // データ取得
  await loadData();
  displayCurrentCard();

  // ローディング解除
  loader.style.display      = 'none';
  mainContent.style.display = 'block';
}

// データ読み込み
async function loadData() {
  const url = `${GAS_URL}?batch=${currentBatch}`;
  const response = await fetch(url, { method: 'GET', mode: 'cors', headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error);
  currentData = json.data;
  currentIndex = 0;
  updateProgress();
}

// カード表示
function displayCurrentCard() {
  if (currentIndex >= currentData.length) {
    showCompleteScreen();
    return;
  }
  const item = currentData[currentIndex];
  productImage.src       = item.商品画像URL || '';
  productName.textContent     = item.商品名     || '';
  personalColor.textContent   = item.パーソナルカラー || '';
  bodyType.textContent        = item.骨格タイプ   || '';
  productLink.href = item.商品詳細URL || '#';
  updateProgress();

  document.getElementById('mainScreen').classList.remove('hidden');
  editScreen.classList.add('hidden');
  actionButtons.classList.remove('hidden');
}

// プログレスバー更新
function updateProgress() {
  const pct = (currentIndex / currentData.length) * 100;
  dataProgressBar.style.width  = `${pct}%`;
  dataProgressText.textContent = `${currentIndex}/${currentData.length}`;
}

// Like
async function handleLike() {
  const item = currentData[currentIndex];
  await saveData(item.rowIndex, '両方正', '', '');
  currentIndex++;
  displayCurrentCard();
}

// Dislike（画面を切り替えず下に修正フォームを展開）
function handleDislike() {
  editScreen.classList.remove('hidden');
  actionButtons.classList.add('hidden');
  errorType.value = '';
  colorCorrection.style.display = 'none';
  bodyCorrection.style.display = 'none';
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

// Skip
function handleSkip() {
  currentIndex++;
  displayCurrentCard();
}

// エラータイプ変更
function handleErrorTypeChange() {
  colorCorrection.style.display = 'none';
  bodyCorrection.style.display  = 'none';
  if (errorType.value === 'color' || errorType.value === 'both') colorCorrection.style.display = 'block';
  if (errorType.value === 'body'  || errorType.value === 'both') bodyCorrection.style.display  = 'block';
}

// 修正送信
async function submitCorrectionData() {
  const sel = errorType.value;
  if (!sel) return alert('エラータイプを選択してください');
  const colors = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value);
  const bodies = Array.from(document.querySelectorAll('input[name="body"]:checked')).map(cb => cb.value);
  let correctness = sel === 'color' ? 'パーソナルカラーのみ間違っていた'
                  : sel === 'body'  ? '骨格のみ間違っていた'
                  : '両方間違っていた';
  const item = currentData[currentIndex];
  await saveData(item.rowIndex, correctness, colors.join(','), bodies.join(','));
  currentIndex++;

  editScreen.classList.add('hidden');
  actionButtons.classList.remove('hidden');
  displayCurrentCard();
}

// データ保存
async function saveData(rowIndex, correctness, colorCorrections, bodyCorrections) {
  const payload = { action: 'saveData', rowIndex, 正否: correctness, 修正カラー: colorCorrections, 修正骨格: bodyCorrections };
  const resp = await fetch(GAS_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await resp.json();
  if (result.error) throw new Error(result.error);
  return result;
}

// 完了画面
function showCompleteScreen() {
  document.getElementById('mainScreen').classList.add('hidden');
  completeScreen.classList.remove('hidden');
}

// 次バッチ
async function loadNextBatch() {
  currentBatch++;
  completeScreen.classList.add('hidden');
  document.getElementById('mainScreen').classList.remove('hidden');
  await loadData();
  displayCurrentCard();
}

// アプリ起動
window.addEventListener('load', initialize);