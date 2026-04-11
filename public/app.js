const AVATAR_SIZE = 80;

// 座席の座標データ (配置図の番号順 1-34、パーセンテージ指定)
const CHAIR_COORDS = [
    { x: 38, y: 46 },  // 1: ソファ左
    { x: 43, y: 40 },  // 2: ソファ右上
    { x: 39, y: 53 },  // 3: ソファ下
    { x: 59, y: 35 },  // 4: 中央奥 丸テーブル
    { x: 55, y: 42 },  // 5: 中央 丸テーブル
    { x: 52, y: 52 },  // 6: 白テーブル左上
    { x: 59, y: 46 },  // 7: 白テーブル右上
    { x: 63, y: 55 },  // 8: 白テーブル右下
    { x: 49, y: 60 },  // 9: 白テーブル左下
    { x: 56, y: 61 },  // 10: 白テーブル下
    { x: 51, y: 33 },  // 11: 中央奥 上
    { x: 69, y: 42 },  // 12: 右中央 丸テーブル上
    { x: 73, y: 52 },  // 13: 右中央 丸テーブル下
    { x: 68, y: 63 },  // 14: 右中央 下テーブル左
    { x: 74, y: 61 },  // 15: 右中央 下テーブル右
    { x: 72, y: 73 },  // 16: 右手前 テーブル左
    { x: 81, y: 70 },  // 17: 右手前 テーブル右
    { x: 84, y: 61 },  // 18: 右PCデスク手前
    { x: 94, y: 56 },  // 19: 右端PCデスク
    { x: 89, y: 45 },  // 20: 右PCデスク中央
    { x: 79, y: 34 },  // 21: 右PCデスク奥左
    { x: 88, y: 29 },  // 22: 右PCデスク奥右上
    { x: 92, y: 35 },  // 23: 右PCデスク奥右下
    { x: 64, y: 74 },  // 24: 中央手前テーブル
    { x: 36, y: 80 },  // 25: 左テーブル右手前
    { x: 26, y: 83 },  // 26: 左テーブル左手前
    { x: 32, y: 67 },  // 27: 左テーブル右奥
    { x: 20, y: 79 },  // 28: 左テーブル左下
    { x: 25, y: 72 },  // 29: 左テーブル中央
    { x: 21, y: 62 },  // 30: 左テーブル左上
    { x: 17, y: 66 },  // 31: 左テーブル窓側上
    { x: 8, y: 70 },   // 32: 左端 窓際
    { x: 88, y: 51 },  // 33: 右PCデスク中段
    { x: 97, y: 71 },  // 34: 右端下
];

// 座席の割当を管理するシステム
const assignedSeats = new Map(); // participantId -> seatIndex
const availableSeats = new Set(Array.from({length: CHAIR_COORDS.length}, (_, i) => i));

function getRandomAvailableSeat() {
    if (availableSeats.size === 0) return null; // 空席なし
    const items = Array.from(availableSeats);
    const randomIndex = Math.floor(Math.random() * items.length);
    const chosenIter = items[randomIndex];
    availableSeats.delete(chosenIter);
    return chosenIter;
}

// 現在の参加者を格納するMap (id -> DOM要素)
let renderedParticipants = new Map();

async function fetchParticipants() {
    try {
        const response = await fetch('/api/participants');
        if (!response.ok) throw new Error('APIに接続できません');
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        // 仮データの表示（ローカルテスト用、バックエンド未接続用）
        console.warn('API取得エラーのため、仮データを表示します。', error);
        if (renderedParticipants.size === 0) {
            updateUI([
                { id: "1", username: "Nakamura", displayName: "中村塾長", avatarURL: null },
                { id: "2", username: "StudentA", displayName: "生徒A", avatarURL: null },
                { id: "3", username: "StudentB", displayName: "生徒B", avatarURL: null }
            ]);
        }
    }
}

function updateUI(participants) {
    const layer = document.getElementById('avatars-layer');
    document.getElementById('participant-count').textContent = participants.length;

    const layerRect = layer.getBoundingClientRect();
    
    // 現在のIDセットを作成（削除判定用）
    const currentIds = new Set(participants.map(p => p.id));

    // 退室した人を画面から消し、座席を解放する
    for (const [id, element] of renderedParticipants.entries()) {
        if (!currentIds.has(id)) {
            element.style.opacity = '0';
            element.style.transform = 'translate(-50%, -90%) scale(0)';
            setTimeout(() => {
                if (element.parentNode) element.parentNode.removeChild(element);
            }, 500);
            renderedParticipants.delete(id);
            
            // 席を解放
            if (assignedSeats.has(id)) {
                const freedSeat = assignedSeats.get(id);
                availableSeats.add(freedSeat);
                assignedSeats.delete(id);
            }
        }
    }

    // 入室した人を画面に追加する
    participants.forEach(p => {
        if (!renderedParticipants.has(p.id)) {
            const el = createAvatarElement(p);
            
            let xPos, yPos;
            
            // 空席を取得
            const seatIndex = getRandomAvailableSeat();
            
            let yPercent;

            if (seatIndex !== null) {
                // 座席がある場合は、指定された固定座標(%)に配置
                xPos = CHAIR_COORDS[seatIndex].x + "%";
                yPos = CHAIR_COORDS[seatIndex].y + "%";
                yPercent = CHAIR_COORDS[seatIndex].y;
                assignedSeats.set(p.id, seatIndex);
            } else {
                // 35人目以降（満席の場合）は、立たせてランダムに端の方に配置
                const paddingX = layerRect.width * 0.05;
                const paddingY = layerRect.height * 0.8; // 下の方に立たせる
                const randomX = paddingX + Math.random() * (layerRect.width - paddingX * 2);
                const randomY = paddingY + Math.random() * (layerRect.height - paddingY);
                xPos = `${randomX}px`;
                yPos = `${randomY}px`;
                yPercent = 85;
            }

            el.style.left = xPos;
            el.style.top = yPos;

            // 遠近感: y座標に応じてサイズを調整 (奥=小さく、手前=大きく)
            const depthScale = 0.4 + (yPercent / 100) * 0.8;
            el.style.setProperty('--depth-scale', depthScale);
            el.style.zIndex = Math.round(yPercent);
            
            layer.appendChild(el);
            renderedParticipants.set(p.id, el);
        }
    });
}

function createAvatarElement(participant) {
    const container = document.createElement('div');
    container.className = 'avatar-container';

    const img = document.createElement('img');
    img.className = 'avatar-img';
    
    // Discordのアバターが設定されていない場合のデフォルト画像処理
    const defaultAvatarId = participant.id ? (BigInt(participant.id) >> 22n) % 6n : Math.floor(Math.random() * 5);
    img.src = participant.avatarURL || `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
    
    img.draggable = false;

    const nameBadge = document.createElement('div');
    nameBadge.className = 'avatar-name';
    
    const onlineDot = document.createElement('span');
    onlineDot.className = 'online-dot';
    
    const nameText = document.createElement('span');
    nameText.textContent = participant.displayName || participant.username;
    
    nameBadge.appendChild(onlineDot);
    nameBadge.appendChild(nameText);

    container.appendChild(img);
    container.appendChild(nameBadge);

    return container;
}

// 初回データ取得
fetchParticipants();

// 5秒ごとに更新（参加・退出が連動する）
setInterval(fetchParticipants, 5000);
