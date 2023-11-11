// APサーバーから取得するリングデータ
export type RingInstance = {
    id: string; // インスタンスのid (UUID)
    location: string; // その場所であるというLocation (UUID)
    started_at: string; // インスタンスが作成された時間 (ISO8601)
    finished_at?: string; // インスタンスが終了した時間 (ISO8601)
    rings?: RingData[]; // リングデータ
}

// APサーバーにPOSTする画像データオブジェクト
export type ImageData = {
    ring_id: string // UUID形式のリングID
    created_at: string; // ISO8601形式の時間データ
    image: string; // base64形式の画像データ
}

// リングの型
export type RingData = {
    "id"?: string; // リングデータのID (UUID)
    "pos_in"?: { // torusの座標
        "x": number;
        "y": number;
    };
    "location": string; // ロケーションピンのID (UUID)
    "longitude": number; // 撮影地点の経度
    "latitude": number; // 撮影地点の緯度
    "indexed": number; // リング軌道内の順番 (DEI中の何個目か、0~69)
    "hue": number; // リングの色調 (0～360)
    "user": string; // ユーザーID (UUID)
    "created_at": string; // 撮影日時 (ISO8601)
    "nonce"?: string; // websocket送信者のID(UUID)
};