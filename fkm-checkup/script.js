// GASエンドポイントURL（実際のURLに置き換えてください）
// const GAS_URL = 'https://script.google.com/macros/s/AKfycbxVsa3mMSlbpKOVxf6niC94-DLaAPiTDP1L-ZdFtplA22YGvmB4bE2g0j2LHvHzvWw/exec';
const GAS_URL = 'https://fkm-checkup.netlify.app/.netlify/functions/proxy-gas';

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
submitCorrection.addEventListener('click', async () => {
    await submitCorrectionData();
});
continueBtn.addEventListener('click', loadNextBatch);
finishBtn.addEventListener('click', () => window.close());
errorType.addEventListener('change', handleErrorTypeChange);

// 初期化
async function initialize() {
    console.log('=== アプリケーション初期化開始 ===');
    console.log('GAS_URL:', GAS_URL);
    console.log('現在の環境:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        location: window.location.href
    });
    
    await loadData();
    displayCurrentCard();
}

// データの読み込み（CORS対応）
async function loadData() {
    console.log(`=== データ読み込み開始 (バッチ ${currentBatch}) ===`);
    
    try {
        const url = `${GAS_URL}?action=getData&batch=${currentBatch}`;
        console.log('リクエストURL:', url);
        
        console.log('リクエストを送信中...');
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('レスポンス受信:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('レスポンスデータ:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // データの構造を確認
        console.log('データ構造:', {
            hasData: !!data.data,
            isArray: Array.isArray(data.data),
            dataLength: data.data ? data.data.length : 0,
            dataKeys: data.data && data.data[0] ? Object.keys(data.data[0]) : []
        });
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('データの形式が不正です');
        }
        
        currentData = data.data;
        currentIndex = 0;
        updateProgress();
        
        console.log('データ読み込み成功:', currentData.length + '件');
    } catch (error) {
        console.error('=== データ読み込みエラー ===');
        console.error('エラーの種類:', error.name);
        console.error('エラーメッセージ:', error.message);
        console.error('エラースタック:', error.stack);
        
        // 詳細なネットワークエラー情報
        if (error.message === 'Failed to fetch') {
            console.error('ネットワークエラーの可能性:');
            console.error('- CORS設定が不適切');
            console.error('- SSL証明書エラー');
            console.error('- ファイアウォールによるブロック');
            console.error('- インターネット接続断絶');
        }
        
        alert('サーバーに接続できません。以下を確認してください：\n1. インターネット接続\n2. GAS_URLが正しいか\n3. スクリプトが正しくデプロイされているか\n\n詳細はコンソールを確認してください。');
    }
}

// 現在のカードを表示
function displayCurrentCard() {
    console.log(`=== カード表示 (${currentIndex + 1}/${currentData.length}) ===`);
    
    if (currentIndex >= currentData.length) {
        console.log('全データ処理完了');
        showCompleteScreen();
        return;
    }
    
    const item = currentData[currentIndex];
    console.log('現在のアイテム:', item);
    
    // カラム名の存在確認と表示
    try {
        if (item.商品画像URL) {
            productImage.src = item.商品画像URL;
            productImage.onerror = () => {
                console.error('画像読み込みエラー:', item.商品画像URL);
            };
        }
        if (item.商品名) productName.textContent = item.商品名;
        if (item.パーソナルカラー) personalColor.textContent = item.パーソナルカラー;
        if (item.骨格タイプ) bodyType.textContent = item.骨格タイプ;
        
        updateProgress();
        
        console.log('カード表示成功');
    } catch (error) {
        console.error('カード表示エラー:', error);
    }
}

// プログレスバーの更新
function updateProgress() {
    const progress = ((currentIndex) / currentData.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${currentIndex}/${currentData.length}`;
    console.log(`進捗: ${currentIndex}/${currentData.length} (${progress.toFixed(1)}%)`);
}

// Likeボタンの処理
async function handleLike() {
    console.log('=== Likeボタン処理 ===');
    try {
        const currentItem = currentData[currentIndex];
        console.log('保存対象アイテム:', currentItem);
        await saveData(currentItem.rowIndex, '両方正', '', '');
        currentIndex++;
        displayCurrentCard();
    } catch (error) {
        console.error('Like処理エラー:', error);
        alert('データの保存に失敗しました');
    }
}

// Dislikeボタンの処理
function handleDislike() {
    console.log('=== Dislikeボタン処理 ===');
    mainScreen.classList.add('hidden');
    editScreen.classList.remove('hidden');
    // フォームのリセット
    errorType.value = '';
    resetCheckboxes();
    console.log('編集画面に切り替え');
}

// エラータイプ変更時の処理
function handleErrorTypeChange() {
    console.log('エラータイプ変更:', errorType.value);
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
    console.log('チェックボックスリセット完了');
}

// 修正の送信
async function submitCorrectionData() {
    console.log('=== 修正データ送信 ===');
    const selectedError = errorType.value;
    
    if (!selectedError) {
        console.error('エラータイプが選択されていません');
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
    
    console.log('選択された修正:', {
        errorType: selectedError,
        colorValues: colorValues,
        bodyValues: bodyValues
    });
    
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
    
    console.log('正否:', correctness);
    
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
        console.error('修正データ保存エラー:', error);
        alert('データの保存に失敗しました');
    }
}

// データの保存（CORS対応）
async function saveData(rowIndex, correctness, colorCorrections, bodyCorrections) {
    console.log('=== データ保存 ===');
    const data = {
        action: 'saveData',
        rowIndex: rowIndex,
        正否: correctness,
        修正カラー: colorCorrections,
        修正骨格: bodyCorrections
    };
    
    console.log('保存データ:', data);
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('保存レスポンス:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText
        });
        
        const result = await response.json();
        console.log('保存結果:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return result;
    } catch (error) {
        console.error('データ保存エラー:', error);
        throw error;
    }
}

// 完了画面の表示
function showCompleteScreen() {
    console.log('=== 完了画面表示 ===');
    mainScreen.classList.add('hidden');
    completeScreen.classList.remove('hidden');
}

// 次のバッチの読み込み
async function loadNextBatch() {
    console.log('=== 次のバッチ読み込み ===');
    currentBatch++;
    completeScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    await loadData();
    displayCurrentCard();
}

// アプリケーションの開始
console.log('スクリプト読み込み完了。初期化を開始します...');
window.addEventListener('load', initialize);