// GASエンドポイントURL（実際のURLに置き換えてください）
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxVsa3mMSlbpKOVxf6niC94-DLaAPiTDP1L-ZdFtplA22YGvmB4bE2g0j2LHvHzvWw/exec';

// CORSエラー緩和のため、リクエストを少し工夫します
const CORS_PROXY = ''; // プロキシを使用せず直接アクセス

let currentIndex = 0;
let currentData = [];
let currentBatch = 1;

// DOM要素の取得
const card = document.getElementById('card');
const productImage = document.getElementById('productImage');
const productName = document.getElementById('productName');
const personalColor = document.getElementById('personalColor');
const bodyType = document.getElementById('bodyType');
const likeBtn = document.getElementById('likeBtn');
const dislikeBtn = document.getElementById('dislikeBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const mainScreen = document.getElementById('mainScreen');
const editScreen = document.getElementById('editScreen');
const completeScreen = document.getElementById('completeScreen');
const errorType = document.getElementById('errorType');
const colorCorrection = document.getElementById('colorCorrection');
const bodyCorrection = document.getElementById('bodyCorrection');
const submitCorrection = document.getElementById('submitCorrection');
const continueBtn = document.getElementById('continueBtn');
const finishBtn = document.getElementById('finishBtn');

// イベントリスナーの設定
likeBtn.addEventListener('click', handleLike);
dislikeBtn.addEventListener('click', handleDislike);
submitCorrection.addEventListener('click', submitCorrection);
continueBtn.addEventListener('click', loadNextBatch);
finishBtn.addEventListener('click', () => window.close());
errorType.addEventListener('change', handleErrorTypeChange);

// 初期化
async function initialize() {
    await loadData();
    displayCurrentCard();
}

// データの読み込み（CORS対応）
async function loadData() {
    try {
        const url = `${GAS_URL}?action=getData&batch=${currentBatch}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // データの構造を確認
        console.log('Received data:', data);
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('データの形式が不正です');
        }
        
        currentData = data.data;
        currentIndex = 0;
        updateProgress();
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.message === 'Failed to fetch') {
            alert('サーバーに接続できません。以下を確認してください：\n1. インターネット接続\n2. GAS_URLが正しいか\n3. スクリプトが正しくデプロイされているか');
        } else {
            alert('データの読み込みに失敗しました: ' + error.message);
        }
    }
}

// 現在のカードを表示
function displayCurrentCard() {
    if (currentIndex >= currentData.length) {
        showCompleteScreen();
        return;
    }
    
    const item = currentData[currentIndex];
    console.log('Current item:', item); // デバッグ用
    
    // カラム名の存在確認と表示
    if (item.商品画像URL) productImage.src = item.商品画像URL;
    if (item.商品名) productName.textContent = item.商品名;
    if (item.パーソナルカラー) personalColor.textContent = item.パーソナルカラー;
    if (item.骨格タイプ) bodyType.textContent = item.骨格タイプ;
    
    updateProgress();
}

// プログレスバーの更新
function updateProgress() {
    const progress = ((currentIndex) / currentData.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${currentIndex}/${currentData.length}`;
}

// Likeボタンの処理
async function handleLike() {
    try {
        const currentItem = currentData[currentIndex];
        await saveData(currentItem.rowIndex, '両方正', '', '');
        currentIndex++;
        displayCurrentCard();
    } catch (error) {
        console.error('Error saving like:', error);
        alert('データの保存に失敗しました');
    }
}

// Dislikeボタンの処理
function handleDislike() {
    mainScreen.classList.add('hidden');
    editScreen.classList.remove('hidden');
    // フォームのリセット
    errorType.value = '';
    resetCheckboxes();
}

// エラータイプ変更時の処理
function handleErrorTypeChange() {
    colorCorrection.style.display = 'none';
    bodyCorrection.style.display = 'none';
    
    const selected = errorType.value;
    if (selected === 'color' || selected === 'both') {
        colorCorrection.style.display = 'block';
    }
    if (selected === 'body' || selected === 'both') {
        bodyCorrection.style.display = 'block';
    }
}

// チェックボックスのリセット
function resetCheckboxes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
}

// 修正の送信
async function submitCorrectionData() {
    const selectedError = errorType.value;
    if (!selectedError) {
        alert('エラータイプを選択してください');
        return;
    }
    
    let colorValues = [];
    let bodyValues = [];
    
    // カラー修正の取得
    const colorCheckboxes = document.querySelectorAll('input[name="color"]:checked');
    colorValues = Array.from(colorCheckboxes).map(cb => cb.value);
    
    // 骨格修正の取得
    const bodyCheckboxes = document.querySelectorAll('input[name="body"]:checked');
    bodyValues = Array.from(bodyCheckboxes).map(cb => cb.value);
    
    // エラータイプに応じた正否の決定
    let correctness = '';
    switch (selectedError) {
        case 'color':
            correctness = 'パーソナルカラーのみ間違っていた';
            break;
        case 'body':
            correctness = '骨格のみ間違っていた';
            break;
        case 'both':
            correctness = '両方間違っていた';
            break;
    }
    
    try {
        const currentItem = currentData[currentIndex];
        await saveData(
            currentItem.rowIndex,
            correctness,
            colorValues.join(','),
            bodyValues.join(',')
        );
        
        currentIndex++;
        editScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        displayCurrentCard();
    } catch (error) {
        console.error('Error saving correction:', error);
        alert('データの保存に失敗しました');
    }
}

// データの保存（CORS対応）
async function saveData(rowIndex, correctness, colorCorrections, bodyCorrections) {
    const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            action: 'saveData',
            rowIndex: rowIndex,
            正否: correctness,
            修正カラー: colorCorrections,
            修正骨格: bodyCorrections
        })
    });
    
    const result = await response.json();
    if (result.error) {
        throw new Error(result.error);
    }
    
    return result;
}

// 完了画面の表示
function showCompleteScreen() {
    mainScreen.classList.add('hidden');
    completeScreen.classList.remove('hidden');
}

// 次のバッチの読み込み
async function loadNextBatch() {
    currentBatch++;
    completeScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    await loadData();
    displayCurrentCard();
}

// submitCorrectionの修正
submitCorrection.addEventListener('click', async () => {
    await submitCorrectionData();
});

// アプリケーションの開始
initialize();