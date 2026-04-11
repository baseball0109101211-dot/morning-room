const AVATAR_SIZE = 80;

// 座席の座標データ (16:9比率画像内のパーセンテージ。xが横、yが縦)
const CHAIR_COORDS = [
    // 左下手前の長テーブル (6脚)
    { x: 13, y: 79 }, { x: 19, y: 74 }, { x: 26, y: 68 }, // 左列 (手前から奥へ)
    { x: 28, y: 84 }, { x: 34, y: 79 }, { x: 41, y: 73 }, // 右列 (手前から奥へ)

    // 左中央のソファとアームチェア (2脚分)
    { x: 38, y: 42 }, { x: 45, y: 38 },

    // 中央手前の四角いテーブル (3脚)
    { x: 57, y: 75 }, { x: 54, y: 88 }, { x: 67, y: 83 },

    // 中央エリアの白い長テーブル (4脚)
    { x: 48, y: 57 }, { x: 54, y: 62 }, { x: 59, y: 53 }, { x: 66, y: 59 },

    // 中央奥（ソファの右側）の丸テーブル (2脚)
    { x: 55, y: 38 }, { x: 61, y: 40 },

    // 少し右奥にある丸テーブル (2脚)
    { x: 68, y: 49 }, { x: 73, y: 48 },

    // 右奥のパソコン用長テーブル (4脚)
    { x: 79, y: 36 }, { x: 86, y: 41 }, { x: 89, y: 31 }, { x: 94, y: 36 },

    // カウンター手前の丸テーブル (2脚)
    { x: 70, y: 24 }, { x: 74, y: 28 },

    // 右手前（丸テーブル） (3脚)
    { x: 78, y: 71 }, { x: 84, y: 79 }, { x: 92, y: 77 }
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
            
            if (seatIndex !== null) {
                // 座席がある場合は、指定された固定座標(%)に配置
                xPos = CHAIR_COORDS[seatIndex].x + "%";
                yPos = CHAIR_COORDS[seatIndex].y + "%";
                assignedSeats.set(p.id, seatIndex);
            } else {
                // 27人目以降（満席の場合）は、立たせてランダムに端の方に配置
                const paddingX = layerRect.width * 0.05;
                const paddingY = layerRect.height * 0.8; // 下の方に立たせる
                const randomX = paddingX + Math.random() * (layerRect.width - paddingX * 2);
                const randomY = paddingY + Math.random() * (layerRect.height - paddingY);
                xPos = `${randomX}px`;
                yPos = `${randomY}px`;
            }
            
            el.style.left = xPos;
            el.style.top = yPos;
            
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
