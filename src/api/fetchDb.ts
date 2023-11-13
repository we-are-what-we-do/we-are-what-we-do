import { Point, FeatureCollection } from 'geojson';
import { compareISO8601Dates } from "../handleRingData";
import { RingData } from "../types";
import { ImageData, RingInstance } from '../types';
import { API_URL, TEST_API_URL } from '../constants';


/* 関数定義 */
// GETリクエストを行う共通関数
async function makeGetRequest(isTrialPage: boolean, apiEndpoint: string, queryParams?: string): Promise<Response>{
    const apiUrl: string = isTrialPage ? TEST_API_URL : API_URL;
    try {
        const url: string = apiUrl + apiEndpoint + (queryParams ?? "");
        console.log({url});

        const response = await fetch(url);
        console.log(response)

        // レスポンスをハンドリングする
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
export async function getLocationConfig(isTrialPage: boolean = false): Promise<FeatureCollection<Point>>{
    let result: FeatureCollection<Point> | null = null;

    // localStorageを取り扱うためのラベルを取得する
    const isDevelopment: boolean = API_URL === TEST_API_URL; // developかどうかを判断する
    const labelLocations: string = isDevelopment ? "locations" : "locations-test";
    const labelETag: string = isDevelopment ? "ETag" : "ETag-test";

    // 前回のETagをLocalStorageから取得
    const previousETag = localStorage.getItem(labelETag) || null;
    console.log({previousETag});

    // ロケーションデータのGETリクエストを行う
    const url: string = (isTrialPage ? TEST_API_URL : API_URL) + "locations";
    const headers: HeadersInit | undefined = previousETag ? { "If-None-Match": previousETag } : undefined;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers
        });
        console.log(response)

        // レスポンスをハンドリングする
        if(response.ok){
            // ピンの全設定データを取得する
            result = await response.json() as FeatureCollection<Point>;

            // 保存するETagを更新しておく
            const etag: string = response.headers.get("ETag") || "";
            localStorage.setItem(labelETag, etag);

            // サーバーから取得したデータをキャッシュに保存する
            localStorage.setItem(labelLocations, JSON.stringify(result));
            console.log("キャッシュにgeolocationデータを保存しました");
        }else if(response.status === 304){
            // etagで、前回取得したデータと変わらない場合は、キャッシュに保存されたロケーションデータを返す
            const cashData: string | null = localStorage.getItem(labelLocations);
            if(!cashData) throw new Error("etagを使ったのにキャッシュからgeolocationデータを読み込めませんでした");
            const locationData = JSON.parse(cashData) as FeatureCollection<Point>;
            result = locationData;
            console.log("キャッシュからロケーションデータを読み込みました", locationData);
        }else{
            // エラーレスポンスの場合はエラーハンドリングを行う
            throw new Error(`HTTPエラー: ${response.status}`);
        }
    }catch(error){
        // エラーハンドリング
        console.error('リクエストエラー:', error);
        throw error;
    }

    return result;
}

// ピン一か所から、リングのデータを取得する関数
export async function getRingData(isTrialPage: boolean = false, requireFinished: boolean = false): Promise<RingData[]>{
    const apiEndpoint: string = "rings";

    // インスタンス一覧を取得する
    const latestInstanceId: string | null = await getLatestInstanceId(isTrialPage, apiEndpoint, requireFinished); // 全インスタンスを取得し、最新のインスタンスを切り出す
    if(!latestInstanceId) return []; // 有効なインスタンスが一つもない場合は、空配列で開始する

    // 最新のインスタンスを取得する
    const queryParams: string = `?id=${latestInstanceId}`
    const response: Response = await makeGetRequest(isTrialPage, apiEndpoint, queryParams);
    const data: RingInstance = await response.json();

    // リングデータを取得する
    const ringData: RingData[] | undefined = data.rings;
    if(ringData === undefined) throw new Error("取得したデータにringsプロパティがありません")

    return ringData;
}

// 最新のインスタンスのIDを取得する関数
async function getLatestInstanceId(isTrialPage: boolean, apiEndpoint: string, requireFinished: boolean = false): Promise<string | null>{
    const response: Response = await makeGetRequest(isTrialPage, apiEndpoint);
    const data: RingInstance[] = await response.json();
    const latestInstance: RingInstance | null = data.reduce((latestInstance: RingInstance | null, currentInstance: RingInstance) => {
        // 終了済みのインスタンスの中から最新のものを取得する場合は、finished_atが付いたもののみを計算する
        if(requireFinished && !currentInstance.finished_at){
            return latestInstance;
        }

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
console.log({data, latestInstance})
    return latestInstanceId;
}

// 完成しているリングインスタンスの数を取得する関数
export async function getFinishedInstancesCount(isTrialPage: boolean = false): Promise<number>{
    const apiEndpoint: string = "rings";

    // インスタンス一覧を取得する
    let data: RingInstance[] = [];
    try{
        const response: Response = await makeGetRequest(isTrialPage, apiEndpoint);
        data = await response.json();
    }catch(error){
        console.error(error);
    }

    const finishedInstances: RingInstance[] = data.filter((ringInstance) => {
        if(ringInstance.finished_at) return ringInstance;
    });

    return finishedInstances.length;
}

// JSONのPOSTリクエストを行う共通関数
async function makePostRequest(isTrialPage: boolean, apiEndpoint: string, data: Object): Promise<Response>{
    const apiUrl: string = isTrialPage ? TEST_API_URL : API_URL;
    try {
        const url: string = apiUrl + apiEndpoint;
        console.log({url, data})
        const response: Response = await fetch(url, {
            method: 'POST',
            mode: "cors",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        console.log({apiEndpoint: response})
        if(response.ok){
            // HTTPステータスコードが2xx（成功）の場合にレスポンスを返す
            return response;
        }else{
            // エラーレスポンスの場合はエラーハンドリングを行う
            console.error(`HTTPエラー: ${response.status}`);
            return response; // エラーレスポンスを返す
        }
    }catch(error){
        // エラーハンドリング
        console.error('POSTリクエストエラー:', error);
        throw error; // Errorを返す
    }
}

// リングのデータを送信する関数
export async function postRingData(isTrialPage: boolean, data: RingData): Promise<Response>{
    const apiEndpoint: string = "rings"; // リングのデータを送信するための、APIのエンドポイント
    const response: Response = await makePostRequest(isTrialPage, apiEndpoint, data);
    return response;
}

// 撮影した写真を送信する関数
export async function postImageData(isTrialPage: boolean, data: ImageData): Promise<Response>{
    const apiEndpoint: string = "images"; // 撮影した写真を送信するための、APIのエンドポイント
    const response: Response = await makePostRequest(isTrialPage, apiEndpoint, data);
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