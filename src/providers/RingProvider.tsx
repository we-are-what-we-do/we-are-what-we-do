import { createContext, useState, ReactNode, useContext } from 'react';
import { UserContext } from './UserProvider';
import { GpsContext } from './GpsProvider';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { TorusInfo, pushTorusInfo, resetHandle } from '../redux/features/torusInfo-slice';
import { RingData, convertToTorus, getAvailableIndex, getIso8601DateTime, getRingColor } from '../handleRingData';
import { Ring, positionArray, torusScale } from '../torusPosition';
import { v4 as uuidv4 } from 'uuid';
import { clientId } from '../constants';


/* 型定義 */
// contextに渡すデータの型
type RingContent = {
    getRingDataToAdd: (newTorus?: AddedTorusInfo | null,  nonce?: string) => RingData | null;
    addTorus: (usedOrbitIndexes: number[]) => TorusWithData;
    usedOrbitIndexes: number[];
    setUsedOrbitIndexes: React.Dispatch<React.SetStateAction<number[]>>;
    addedTorus: TorusWithData |null;
    initializeRingDraw(ringsData: RingData[]): void;
    reChoiceAddedTorus(usedOrbitIndexes: number[]): number;
};

// 追加したリング(TorusInfo)のデータ
type AddedTorusInfo = {
    orbitIndex: number;
    ringHue: number;
};

// TorusInfoを軌道index等と合わせたデータ
type TorusWithData = {
    torusData: AddedTorusInfo;
    torus: TorusInfo;
}


/* 定数定義 */
const orbitLength: number = positionArray.length; // DEI一周に必要なリングの数


/* Provider */
const initialData: RingContent = {
    getRingDataToAdd: () => null,
    addTorus: () => ({} as TorusWithData),
    usedOrbitIndexes: [],
    setUsedOrbitIndexes: () => {},
    addedTorus: null,
    initializeRingDraw: () => {},
    reChoiceAddedTorus: () => 0
};

export const RingContext = createContext<RingContent>(initialData);

// リング追加を司るプロバイダー
export function RingProvider({children}: {children: ReactNode}){
    /* useState, useContext等 */
    // ユーザーIDを管理するcontext
    const {
        userIdRef
    } = useContext(UserContext);

    // GPSの状態を管理するcontext
    const {
        location,
        currentLatitude,
        currentLongitude
    } = useContext(GpsContext);

    // リングデータを管理するstate
    const [addedTorus, setAddedTorus] = useState<TorusWithData |null>(null); // 追加したリング(AddedTorusInfo)のデータ
    const [usedOrbitIndexes, setUsedOrbitIndexes] = useState<number[]>([]); // リングが既に埋まっている軌道内位置のデータ

    // dispatch
    const dispatch = useDispatch<AppDispatch>();


    /* 関数定義 */
    // 現在のリングのデータ(ringsData)で、3Dオブジェクトを初期表示して、リングを追加する関数
    function initializeRingDraw(ringsData: RingData[]): void{
        // 描画の初期化処理
        dispatch(resetHandle()); // 全3Dを消去する
        let newUsedOrbitIndexes: number[] = [];

        // 3Dオブジェクトの初期表示を行う
        Object.entries(ringsData).forEach(([_key, value]) => {
            // リングデータを使用して、3Dオブジェクトを1つ作成する
            const newTorus: TorusInfo = convertToTorus(value);
            dispatch(pushTorusInfo(newTorus)); //リング情報をオブジェクトに詰め込みstoreへ送る

            newUsedOrbitIndexes.push(value.indexed); // 使用済みの軌道indexとして保管する
        });

        // 取得したデータ+1でリングを追加し、追加した軌道indexを取得する
        const newTorus: TorusWithData = addTorus(newUsedOrbitIndexes);
        const newTorusData: AddedTorusInfo = newTorus.torusData;
        const newOrbitIndex: number = newTorusData.orbitIndex;
        if(newUsedOrbitIndexes.length >= orbitLength) newUsedOrbitIndexes = [];
        newUsedOrbitIndexes.push(newOrbitIndex);

        setUsedOrbitIndexes(newUsedOrbitIndexes); // 使用済みの軌道indexをstateで保管する
        setAddedTorus(newTorus); // 追加したリングデータ
    }

    // 自分が追加するリングデータを選び直す関数
    function reChoiceAddedTorus(usedOrbitIndexes: number[]): number{
        // 新しくリングを選択する
        // const currentUsedOrbitIndexes: number[] = [usedOrbitIndexes]
        console.log("reChoiceAddedTorus", {formerIndex: addedTorus?.torusData.orbitIndex, usedOrbitIndexes})
        // 追加するためのリングを生成する
        // 既にDEIが完成していてもうリングを追加できない場合は、nullが取得される
        let newTorusData: TorusWithData | null = createTorus(usedOrbitIndexes);
        if(!newTorusData) throw new Error("DEIに空きがなく、リングを選び直せませんでした");

        // 生成したリングの軌道indexを取得する
        const newOrbitIndex: number = newTorusData.torusData.orbitIndex;

        // 生成したリングを追加する
        dispatch(pushTorusInfo(newTorusData.torus));

        // 選択したリングの情報をstateに保存する
        setAddedTorus(newTorusData);

        return newOrbitIndex;
    }

    // リングのデータ(TorusInfo)を生成する関数
    // DEI一周分が完成していて、新しいリングを生成できないときはnullを返す
    function createTorus(usedOrbitIndexes: number[]): TorusWithData | null{
        const ringHue: number = Math.floor(Math.random() * 361); // リングの色調
        let newOrbitIndex: number | null = null; // DEI内の軌道番号

        // 既に全てのリングが埋まっている場合
        if (usedOrbitIndexes.length >= orbitLength) {
            return null;
        }

        // DEI軌道の中から、空いているリングの位置をランダムに取得する
        // console.log("現在埋まっているリング位置:\n", usedOrbitIndexes);
        newOrbitIndex = getAvailableIndex(usedOrbitIndexes); 
        if(newOrbitIndex === null){
            throw new Error("DEI軌道のリングが全て埋まっているのに、リングを作成しようとしました");
        }

        // 最終的なTorusInfoを生成する
        const newRingPosition: Ring = positionArray[newOrbitIndex];
        const newTorus: TorusInfo = {
            id: uuidv4(),
            color: getRingColor(ringHue),
            rotateX: newRingPosition.rotateX,
            rotateY: newRingPosition.rotateY,
            positionX: newRingPosition.positionX,
            positionY: newRingPosition.positionY,
            scale: torusScale
        };


        const torusData: AddedTorusInfo = {
            orbitIndex: newOrbitIndex,
            ringHue
        };
        const result: TorusWithData = {
            torusData,
            torus: newTorus
        };
        return result;
    }

    // リングの3Dオブジェクトを追加して描画する関数
    // 追加したリングの軌道indexを返す
    function addTorus(orbitIndexes: number[]): TorusWithData{
        let needDrawClear: boolean = false; // リング追加の描画時に、canvasの初期化が必要かどうか

        // 追加するためのリングを生成する
        // 既にDEIが完成していてもうリングを追加できない場合は、nullが取得される
        let newTorusData: TorusWithData | null = createTorus(orbitIndexes);

        // DEIが完成している場合、描画を初期化してから、リング生成をもう一度試みる
        if(!newTorusData){
            // 描画を初期化するよう設定する
            needDrawClear = true;

            // リング生成をもう一度試みる
            newTorusData = createTorus([]);

            // それでもダメだった場合、エラーを返す
            if(!newTorusData){
                throw new Error("新たなDEI周にリングを生成できませんでした。");
            };

            // 描画を初期化したので、stateで保管している軌道index配列も初期化する
            setUsedOrbitIndexes([]);
        }

        //リング情報をオブジェクトに詰め込みstoreへ送る
        const newTorus: TorusInfo = newTorusData.torus;
        if(needDrawClear) dispatch(resetHandle()); // DEIの新たな周を描画する場合、canvasを初期化する
        dispatch(pushTorusInfo(newTorus));

        // 描画として追加したリングの軌道indexを返す
        return newTorusData;
    };

    // サーバーに送信するためのリングデータを取得する関数
    function getRingDataToAdd(newTorus: AddedTorusInfo | null = addedTorus?.torusData ?? null, nonce: string = clientId): RingData | null{
        if(
            (!location) ||
            (currentLatitude === null) ||
            (currentLongitude === null) ||
            (!userIdRef.current) ||
            (!newTorus)
        ){
            console.error({location, currentLatitude, currentLongitude, userId: userIdRef.current, newTorus});
            return null;
        }

        const newRingData: RingData = {
            location, // 撮影場所
            latitude: currentLatitude, // 撮影地点の緯度
            longitude: currentLongitude, // 撮影地点の経度
            user: userIdRef.current, // ユーザーID
            indexed: newTorus.orbitIndex, // リング軌道内の順番(DEI中の何個目か、0~70)
            hue: newTorus.ringHue, // リングの色調
            created_at: getIso8601DateTime(), // 撮影日時
            nonce // 送信者ID
        };

        // TODO テスト用のランダムユーザーIDをやめる
        // const newRandomUserId: string = uuidv4();
        // newRingData.user = newRandomUserId;

        return newRingData;
    }

    return (
        <RingContext.Provider
            value={{
                getRingDataToAdd,
                addTorus,
                usedOrbitIndexes,
                setUsedOrbitIndexes,
                addedTorus,
                initializeRingDraw,
                reChoiceAddedTorus
            }}
        >
            {children}
        </RingContext.Provider>
    );
}