import { Point, FeatureCollection } from 'geojson';
import { compareISO8601Dates } from "../handleRingData";
import { RingData } from "../types";
import { ImageData, RingInstance } from '../types';
import { API_URL, TEST_API_URL } from '../constants';


/* 関数定義 */
// GETリクエストを行う共通関数
async function makeGetRequest(isTrialPage: boolean, apiEndpoint: string, queryParams?: string, etag?: string | null): Promise<Response>{
    const apiUrl: string = isTrialPage ? TEST_API_URL : API_URL;
    try {
        const url: string = apiUrl + apiEndpoint + (queryParams ?? "");
        console.log({url})

        // etag利用のためのヘッダーを作成する
        const headers: HeadersInit | undefined = etag ? { "If-None-Match": etag } : undefined;

        // サーバーにGETリクエストを行う
        const response = await fetch(url, {
            method: "GET",
            headers
        });

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

    // 前回のETagをLocalStorageから取得
    const previousETag = localStorage.getItem("ETag") || null;

    // ピンの全設定データを取得する
    const apiEndpoint: string = "locations";
    const response: Response = await makeGetRequest(isTrialPage, apiEndpoint, "", previousETag);
    result = await response.json() as FeatureCollection<Point>;
    console.log("location: ", result);

    // ETagを保存しておく
    const etag: string = response.headers.get("ETag") || "";
    localStorage.setItem("ETag", etag);

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