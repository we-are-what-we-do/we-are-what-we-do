import { createContext, useState, ReactNode, useEffect } from 'react';
import {
    RingData,
    getLatestRing
} from "../handleRingData";


/* 型定義 */
// contextに渡すデータの型
type DbContent = {
    initializeLatestRing: (newRingsData: RingData[]) => void;
    latestRing: RingData | null;
    setLatestRing: React.Dispatch<React.SetStateAction<RingData | null>>;
};


/* Provider */
const initialData: DbContent = {
    initializeLatestRing: () => {},
    latestRing: null,
    setLatestRing: () => null
};

export const DbContext = createContext<DbContent>(initialData);

export function DbProvider({children}: {children: ReactNode}){
    // リングのデータを管理する
    const [latestRing, setLatestRing] = useState<RingData | null>(null); // 直前に追加されたリングデー

    // 最新リングを、サーバーから取得したデータで初期化する関数
    function initializeLatestRing(newRingsData: RingData[]): void{
        // 最新のリングを取得する
        const newLatestRing: RingData | null = getLatestRing(newRingsData);
        // console.log({newLatestRing});

        // stateを更新する
        setLatestRing(newLatestRing);
    }

    return (
        <DbContext.Provider
            value={{
                latestRing,
                initializeLatestRing,
                setLatestRing
            }}
        >
            {children}
        </DbContext.Provider>
    );
}