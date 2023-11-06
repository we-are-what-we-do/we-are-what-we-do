import { Point, FeatureCollection } from 'geojson';
import { RingData, compareISO8601Dates } from "../handleRingData";
import { ImageData, RingInstance } from '../types';
import { API_URL } from '../constants';


/* 関数定義 */
// GETリクエストを行う共通関数
async function makeGetRequest(apiEndpoint: string, queryParams?: string): Promise<Response>{
    try {
        const url: string = API_URL + apiEndpoint + (queryParams ?? '');
        // console.log({url})
        const response = await fetch(url);
        if(response.ok){
            return response;
        }else{
            // エラーレスポンスの場合はエラーハンドリングを行う
            throw new Error(`HTTPエラー: ${response.status}`);
        }
    }catch(error){
        // エラーハンドリング
        console.error('リクエストエラー:', error);
        throw error;
    }
}

// ピンの全設定データを取得する関数
export async function getLocationConfig(): Promise<FeatureCollection<Point>>{
    let result: FeatureCollection<Point> | null = null;
    // キャッシュデータからのピン設定データ取得を試みる
    const cashData: string | null = localStorage.getItem("locations");
    // localStorage.removeItem("locations"); // localStorageを削除したい際はこのコードで削除する

    if(cashData){
        const locationData = JSON.parse(cashData) as FeatureCollection<Point>;
        result = locationData;
        // console.log("キャッシュからgeolocationデータを読み込みました", locationData);
    }else{
        // キャッシュデータがない場合、サーバーからデータを取得する
        const apiEndpoint: string = "locations";
        const response: Response = await makeGetRequest(apiEndpoint);
        result = await response.json() as FeatureCollection<Point>;
        console.log("location: ", result);

        // サーバーから取得したデータをキャッシュに保存する
        localStorage.setItem("locations", JSON.stringify(result));
        // console.log("キャッシュにgeolocationデータを保存しました", result);
    }
    return result;
}

// ピン一か所から、リングのデータを取得する関数
export async function getRingData(): Promise<RingData[]>{
    const apiEndpoint: string = "rings";

    // インスタンス一覧を取得する
    const latestInstanceId: string | null = await getLatestInstanceId(apiEndpoint); // 全インスタンスを取得し、最新のインスタンスを切り出す
    if(!latestInstanceId) return []; // 有効なインスタンスが一つもない場合は、空配列で開始する

    // 最新のインスタンスを取得する
    const queryParams: string = `?id=${latestInstanceId}`
    const response: Response = await makeGetRequest(apiEndpoint, queryParams);
    const data: RingInstance = await response.json();

    // リングデータを取得する
    const ringData: RingData[] | undefined = data.rings;
    if(ringData === undefined) throw new Error("取得したデータにringsプロパティがありません")

    return ringData;
}

// 最新のインスタンスのIDを取得する関数
async function getLatestInstanceId(apiEndpoint: string): Promise<string | null>{
    const response: Response = await makeGetRequest(apiEndpoint);
    const data: RingInstance[] = await response.json();
    const latestInstance: RingInstance | null = data.reduce((latestInstance: RingInstance | null, currentInstance: RingInstance) => {
        if(!latestInstance){
            return currentInstance;
        }

        // 新しい日付時刻文字列が見つかった場合に更新
        const latestDate: string = latestInstance.started_at;
        const currentDate: string = currentInstance.started_at;
        if(compareISO8601Dates(currentDate, latestDate)){
            return currentInstance;
        }else{
            return latestInstance;
        }
    }, null);
    const latestInstanceId: string | null = latestInstance?.id ?? null; // 有効なインスタンスが一つもない場合は、nullを返す
// console.log({data, latestInstance})
    return latestInstanceId;
}

// JSONのPOSTリクエストを行う共通関数
async function makePostRequest(apiEndpoint: string, data: Object): Promise<Response>{
    try {
        const url: string = API_URL + apiEndpoint;
        // console.log({url, data})
        const response: Response = await fetch(url, {
            method: 'POST',
            mode: "cors",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        // console.log({apiEndpoint: response})
        if(response.ok){
            // HTTPステータスコードが2xx（成功）の場合にレスポンスを返す
            return response;
        }else{
            // console.log(response.status)
            // エラーレスポンスの場合はエラーハンドリングを行う
            throw new Error(`HTTPエラー: ${response.status}`);
        }
    }catch(error){
        // エラーハンドリング
        console.error('POSTリクエストエラー:', error);
        throw error;
    }
}

// リングのデータを送信する関数
export async function postRingData(data: RingData): Promise<Response>{
    const apiEndpoint: string = "rings"; // リングのデータを送信するための、APIのエンドポイント
    const response: Response = await makePostRequest(apiEndpoint, data);
    return response;
}

// 撮影した写真を送信する関数
export async function postImageData(data: ImageData): Promise<Response>{
    const apiEndpoint: string = "images"; // 撮影した写真を送信するための、APIのエンドポイント
    const response: Response = await makePostRequest(apiEndpoint, data);
    return response;
}


// locationIdからlocalize.jpを取得する関数
export function getLocationJp(data: FeatureCollection<Point>, locationId: string): string | null{
    // locationIdが一致するfeatureのproperties.localize.jpを取得する
    const currentFeature = data.features.find((value) => value.id === locationId);
    if(!currentFeature) return null;
    const currentLocationJp: string | null = currentFeature.properties?.localize.jp || null; 

    return currentLocationJp;
}