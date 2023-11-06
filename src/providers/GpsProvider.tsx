import { createContext, useState, ReactNode, useEffect } from 'react';
import { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
import { getLocationConfig } from '../api/fetchDb';
import { haversineDistance } from '../api/distanceCalculations';
import { showInfoToast, showTestToast, showWarnToast } from '../components/ToastHelpers';
import { TEST_LOCATION_ID } from '../constants';


/* 定数定義 */
// 環境変数(REACT_APP_RADIUS)から半径の値を取得 
// 環境変数が数値でない、または設定されていない場合はデフォルト値として 100m を使用
// const RADIUS = process.env.REACT_APP_RADIUS ? parseInt(process.env.REACT_APP_RADIUS) : 100;
const RADIUS = 100;


/* 型定義 */
// contextに渡すデータの型
type Context = {
    gpsFlag: boolean;
    location: string | null;
    currentLatitude: number | null;
    currentLongitude: number | null;
    isLoadedGps: boolean;
};


/* Provider */
const initialData: Context = {
    gpsFlag: false,
    location: null,
    currentLatitude: null,
    currentLongitude: null,
    isLoadedGps: false
};

export const GpsContext = createContext<Context>(initialData);

// GPSの状態を管理するプロバイダー
export function GpsProvider({children}: {children: ReactNode}){
    /* useState, useContext等 */
    const [gpsFlag, setGpsFlag] = useState<boolean>(false); // 現在地がピンの範囲内かどうかのフラグ

    // リングデータをサーバーに送信する際に必要なGPS情報を管理するstate
    const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<Point> | null>(null); // GeoJSONデータ
    const [location, setLocation] = useState<string | null>(null); // 現在値
    const [currentLatitude, setCurrentLatitude] = useState<number | null>(null); // 現在地の緯度
    const [currentLongitude, setCurrentLongitude] = useState<number | null>(null); // 現在地の経度

    // データを取得済みかどうかを管理する
    const [isLoadedGps, setIsLoadedGps] = useState<boolean>(false);

    /* useEffect等 */
    // 初回レンダリング時、GeoJSON Pointデータを取得し、現在地がピンの範囲内かどうかを調べる
    useEffect(() => {
        // ピン設定データを取得する
        try{
            getLocationConfig().then(data => {
                setGeoJsonData(data);
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // 位置情報が変更されたときに呼び出されるコールバック
                        handleChangePosition(position, data, true).then(() => {
                            setIsLoadedGps(true);
                            console.log("isLoadedGps is OK");
                        });
                    },
                    (error) => {
                        if(error.code === error.PERMISSION_DENIED){
                            showWarnToast("E002"); // 「位置情報のアクセスを許可してください」というメッセージを表示する
                        }else{
                            showWarnToast("E099"); // 「システムエラー」というメッセージを表示する
                        }
                    },
                    { enableHighAccuracy: true } // 高い精度を要求
                );
            });
        }catch(error){
            console.error("Error fetching GeoJSON Point data.", error);
        }
    }, []);

    // ユーザーの位置情報を監視し、現在地がピンの範囲内かどうかを調べる
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                // 位置情報が変更されたときに呼び出されるコールバック
                handleChangePosition(position, geoJsonData, false);
            },
            (error) => {
                console.error(`Watching GPS Error:`, error);
            },
            { enableHighAccuracy: true } // 高い精度を要求
        );

        // コンポーネントがアンマウントされたときに監視を停止
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, []);


    /* 関数定義 */
    // ユーザーの現在地が変更された際に実行される関数
    async function handleChangePosition(position: GeolocationPosition, geoJsonData: FeatureCollection<Point> | null, isFirstDone: boolean): Promise<void>{
        // ピン設定データを取得できていない場合、ピン範囲判別処理を行わない
        if(!geoJsonData) return;

        // 現在地の緯度・経度をstateに保存する
        setCurrentPositions(position);

        // 現在地の取得とピンの位置を比較する
        // const locationId: string | null = compareCurrentLocationWithPin(position, geoJsonData, isFirstDone);
        const locationId: string | null = TEST_LOCATION_ID; // テスト用ロケーションIDを使用しないよう修正

        // 比較した結果をstateに保存する
        setLocation(locationId); // ロケーションIDを保存する
        const isInLocation: boolean = Boolean(locationId); // 現在地がピンの範囲内かどうか
        setGpsFlag(isInLocation);  // 現在地がピンの範囲内かどうかを保存する

        // 初回ページ読み込み時のメッセージを表示する
        if(isFirstDone) showWelcomeMessage(isInLocation);
    }

    // 現在地の緯度・経度をstateに保存する関数
    function setCurrentPositions(position: GeolocationPosition): void{
        setCurrentLatitude(position.coords.latitude);
        setCurrentLongitude(position.coords.longitude);
    }

    // 現在地の取得とピンの位置を比較する関数
    function compareCurrentLocationWithPin(position: GeolocationPosition, geoJsonData: FeatureCollection<Point>, isFirstDone: boolean): string | null{
        // 現在地がどのピンIDの範囲内か
        let result: string | null = null;

        // 現在地の緯度・経度を取得する
        const currentLat: number = position.coords.latitude;
        const currentLon: number = position.coords.longitude;

        // 各ピンの位置と現在地との距離をチェック
        for (const feature of geoJsonData.features) {
            // 2点間の距離を求める
            const [longitude, latitude] = feature.geometry.coordinates; // ピンの経度・緯度を取得する
            const distance: number = haversineDistance(currentLat, currentLon, latitude, longitude); // 2点間の距離

            // 2点間の距離に応じて、gpsFlagを適切な値に設定する
            const radius: number = feature.properties?.radius ?? RADIUS; // デフォルトの半径としてRADIUSを指定

            // ピンの範囲内かどうかをチェックしてメッセージとして表示する
            showTestMessage({
                isDo: isFirstDone && false, // TODO 本番環境ではチェック用メッセージは表示しない
                feature,
                distance,
                radius,
                currentLat,
                currentLon,
                latitude,
                longitude
            })

            if (distance <= radius) {
                const locationId: string = String(feature.id) ?? "";
                result = locationId; // 条件に合致した場合、resultにlocationIdを設定
                break; // 1つでも条件に合致するピンが見つかった場合、ループを抜ける
            } else {
                // console.log(`Feature is ${distance} meters away from your current location.`);
            }
        };

        return result;
    }

    // 初回ページ読み込み時にメッセージを表示する関数
    function showWelcomeMessage(isInLocation: boolean){
        if(isInLocation){
            // GPSがピンの範囲内の場合、「ARリングを増やしましょう。」というメッセージボックスを表示する
            showInfoToast("I003");
        }else{
            // GPSがピンの範囲外の場合、「ARリングはピン設置箇所の近くでのみ表示されます。」というメッセージボックスを表示する
            showWarnToast("I001");
        }
    }

    // ピン範囲のチェック用メッセージを表示する関数
    function showTestMessage(settings: {
        isDo: boolean;
        feature: Feature<Point, GeoJsonProperties>;
        distance: number;
        radius: number;
        currentLat: number;
        currentLon: number;
        latitude: number;
        longitude: number;
    }){
        const {
            isDo,
            feature,
            distance,
            radius,
            currentLat,
            currentLon,
            latitude,
            longitude
        } = settings;

        if(!isDo) return; // 実行しない場合、実行しない

        console.log(`${feature.properties?.localize.jp}: ${distance} / ${radius}`, "\n", {currentLat, currentLon, latitude, longitude});

        // テスト用チェックメッセージを表示する
        const testMessages: string[] = [
            "地名: " + feature.properties?.localize.jp,
            "距離: " + `${(Math.floor(distance * 10)) / 10} / ${radius}`,
            "現在地: " + `${currentLat}, ${currentLon}`,
            "場所: " + `${latitude}, ${longitude}`
        ];
        showTestToast(testMessages, (distance <= radius));
    }


    return (
        <GpsContext.Provider
            value={{
                gpsFlag,
                location,
                currentLatitude,
                currentLongitude,
                isLoadedGps
            }}
        >
            {children}
        </GpsContext.Provider>
    );
}