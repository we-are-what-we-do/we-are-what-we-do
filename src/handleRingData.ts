import { Ring, positionArray, torusScale } from "./torusPosition";
import { TorusInfo } from "./redux/features/torusInfo-slice";
import { v4 as uuidv4 } from 'uuid';


/* 型定義 */
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


/* 関数定義 */
// RingData[]型をTorusInfo[]型に変換する関数
export function convertToTori(data: RingData[]): TorusInfo[]{
    const result: TorusInfo[] = new Array;
    data.forEach((value, _index) => {
        const newLocalTorus: TorusInfo = convertToTorus(value);
        result.push(newLocalTorus);
    });
    return result;
}

// RingData型をTorusInfo型に変換する関数
export function convertToTorus(data: RingData): TorusInfo{
    const newRingPosition: Ring = positionArray[data.indexed]; // リングの軌道設定
    const newTorusInfo: TorusInfo = {
        id: uuidv4(),
        color: getRingColor(data.hue),
        rotateX: newRingPosition.rotateX,
        rotateY: newRingPosition.rotateY,
        positionX: newRingPosition.positionX,
        positionY: newRingPosition.positionY,
        scale: torusScale
    };
    return newTorusInfo;
}

// 色調からリングの色を取得する関数
export function getRingColor(ringHue: number): string{
    return `hsl(${ringHue}, 100%, 50%)`;
}

// 全データの中から、直前に追加されたリングのデータを取得する関数
export function getLatestRing(data: RingData[]): RingData | null{
    return data.reduce((latestRing: RingData | null, currentRing: RingData) => {
        if(!latestRing){
            return currentRing;
        }

        // 新しい日付時刻文字列が見つかった場合に更新
        const latestDate: string = latestRing.created_at;
        const currentDate: string = currentRing.created_at;
        if(compareISO8601Dates(currentDate, latestDate)){
            return currentRing;
        }

        return latestRing;
    }, null);
}


// 指定した配列内に存在するindex以外の要素から、ランダムなindexを取得する関数
export function getAvailableIndex(excludedIndexes: number[]): number | null{
    // indexをランダムに取得するための配列を生成する
    const eligibleIndexes = positionArray
        .map((_, index) => index)
        .filter(index => !excludedIndexes.includes(index)); // indexが既に存在する場合は配列に追加しない

    if (eligibleIndexes.length === 0) {
      // すべての要素が除外された場合、nullを返す
        return null;
    }

    const randomIndex = eligibleIndexes[Math.floor(Math.random() * eligibleIndexes.length)];
    
    return randomIndex;
}


/* ISO8601形式の文字列を取り扱う関数 */
// 現在時刻'日本標準時)をISO8601形式の文字列で取得する関数
export function getIso8601DateTime(): string{
    // 取得できる値は必ず日本時間になる
    const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
    return new Date(jstNow).toISOString();
}

// ISO8601形式の日付時刻文字列同士を比較し、どちらが新しいのかを真偽値で取得する関数
export function compareISO8601Dates(dateStr1: string, dateStr2: string): boolean{
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        throw new Error('無効な日付時刻文字列です。');
    }

    return date1 > date2;
}