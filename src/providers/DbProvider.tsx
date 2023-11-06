import { createContext, useState, ReactNode, useEffect } from 'react';
import { TorusInfo } from "./../redux/features/torusInfo-slice";
import {
    RingData,
    convertToTori,
    getLatestRing
} from "../handleRingData";
import { getRingData } from "./../api/fetchDb";


/* 型定義 */
// contextに渡すデータの型
type DbContent = {
    ringsData: RingData[];
    latestRing: RingData | null;
    toriData: TorusInfo[];
    initializeRingData: (location?: string) => Promise<void>;
    addTorusData: (newTorus: TorusInfo) => void;
    setLatestRing: React.Dispatch<React.SetStateAction<RingData | null>>;
    isLoadedData: boolean;
};


/* Provider */
const initialData: DbContent = {
    ringsData: [],
    latestRing: null,
    toriData: [],
    initializeRingData: () => Promise.resolve(),
    addTorusData: () => {},
    setLatestRing: () => null,
    isLoadedData: false
};

export const DbContext = createContext<DbContent>(initialData);

export function DbProvider({children}: {children: ReactNode}){
    // リングのデータを管理する
    const [ringsData, setRingsData] = useState<RingData[]>([]); // サーバーから取得したリングデータ
    const [latestRing, setLatestRing] = useState<RingData | null>(null); // 直前に追加されたリングデータ
    const [toriData, setTori] = useState<TorusInfo[]>([]); // Three.jsで使用するリングデータ

    // データを取得済みかどうかを管理する
    const [isLoadedData, setIsLoadedData] = useState<boolean>(false);

    // 初回レンダリング時、サーバーからデータを取得する
    useEffect(() => {
        initializeRingData();
        console.log("isLoadedData is OK");
    }, [])

    // リングのデータを、サーバーから取得したデータで初期化する関数
    async function initializeRingData(): Promise<void>{
        // リングデータを取得する
        let newRingsData: RingData[] = [];
        try{
            newRingsData = await getRingData();
            setIsLoadedData(true);
        }catch(error){
            // リングデータを取得できなかった際のエラーハンドリング
            showErrorToast("E099"); // 「システムエラー」というメッセージを表示する
        }
        // リングデータを70個までに限定して切り出す(一応)
        const extractedRingData: RingData[] = getLatestLap(newRingsData);
        const newLatestRing: RingData | null = getLatestRing(newRingsData);
        // console.log({newLatestRing});
        let newTori: TorusInfo[] = convertToTori(newRingsData);
        setRingsData(extractedRingData);
        setLatestRing(newLatestRing);
        setTori(newTori);
    }

    // torusArrayに新しいtorusデータを一つ追加する関数
    function addTorusData(newTorus: TorusInfo): void{
        setTori((prevTori) => {
            const newTori: TorusInfo[] = prevTori.slice();
            newTori.push(newTorus);
            return newTori;
        });
    };

    return (
        <DbContext.Provider
            value={{
                ringsData,
                latestRing,
                toriData,
                initializeRingData,
                addTorusData,
                setLatestRing,
                isLoadedData
            }}
        >
            {children}
        </DbContext.Provider>
    );
}


/* 仮定義関数 */
import { positionArray } from '../torusPosition';
import { showErrorToast } from '../components/ToastHelpers';
// 配列の最後のn個のリングデータを直接取得する関数
function getLastRings(data: RingData[], lastAmount: number): RingData[]{
    return data.slice(-lastAmount); // 配列の最後のn個を取得
}

// 過去周のDEI周を切り捨てる関数
export function getLatestLap(data: RingData[]): RingData[]{
    const orbitLength: number = positionArray.length; // DEI一周に必要なリングの数
    const ringAmount: number = data.length; // リングデータの数
    let result: RingData[] = []; // 0～71個のリングデータ
    if(ringAmount <= orbitLength){
        // リングが0～70個の場合
        result = [...data];
    }else{
        // リングが70個より多い場合
        const latestLapLength: number = ringAmount % orbitLength; // 最新のDEI周が何個のリングでできているか
        if(latestLapLength === 0){
            // リング個数が70の倍数のとき
            result = getLastRings(data, orbitLength); // 0個ではなく、70個取得する
        }else{
            result = getLastRings(data, latestLapLength);
        }
    }
    return result;
}