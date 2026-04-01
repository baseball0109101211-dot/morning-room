const AVATAR_SIZE = 80;

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

    // 退室した人を画面から消す
    for (const [id, element] of renderedParticipants.entries()) {
        if (!currentIds.has(id)) {
            element.style.opacity = '0';
            element.style.transform = 'translate(-50%, -50%) scale(0)';
            setTimeout(() => {
                if (element.parentNode) element.parentNode.removeChild(element);
            }, 500);
            renderedParticipants.delete(id);
        }
    }

    // 入室した人を画面に追加する
    participants.forEach(p => {
        if (!renderedParticipants.has(p.id)) {
            const el = createAvatarElement(p);
            
            // 画面の端すぎない場所にランダム配置
            const paddingX = layerRect.width * 0.15;
            const paddingY = layerRect.height * 0.2;
            const x = paddingX + Math.random() * (layerRect.width - paddingX * 2);
            const y = paddingY + Math.random() * (layerRect.height - paddingY * 2);
            
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            
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
    nameBadge.textContent = participant.displayName || participant.username;

    container.appendChild(img);
    container.appendChild(nameBadge);

    return container;
}

// 初回データ取得
fetchParticipants();

// 5秒ごとに更新（参加・退出が連動する）
setInterval(fetchParticipants, 5000);
