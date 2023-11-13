import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { clientId, TEST_WS_URL, WS_URL } from '../constants';
import { DbContext } from './DbProvider';
import { convertToTorus } from '../handleRingData';
import { RingData } from '../types';
import { ImageData } from '../types';
import { postImageData } from '../api/fetchDb';
import { showErrorToast, showSuccessToast, showTestToast, showWarnToast } from '../components/ToastHelpers';
import { RingContext } from './RingProvider';
import { positionArray } from '../torusPosition';
import { initializeTorus, pushTorusInfo, replaceTorus, resetHandle, TorusInfo } from '../redux/features/torusInfo-slice';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '../redux/store';
import { CaptureContext } from './CaptureProvider';
import { SettingsContent } from './SettingsProvider';

// リングデータがコンフリクトした際のエラーレスポンスのメッセージ
const CONFLICT_INDEX_MESSAGE: string = "conflict_ring: Conflict in, `ring`. `Index` should be Unique within a defined value.";
const CONFLICT_USER_ID_MESSAGE: string = "conflict_ring: Conflict in, `ring`. `UserId` conflicts with the last registered user.";

/* 型定義 */
// contextに渡すデータの型
type Context = {
    hasPostRing: React.MutableRefObject<boolean>;
    socketRef: React.MutableRefObject<WebSocket | null>;
    base64Ref: React.MutableRefObject<string | null>;
    isLoadedData: boolean;
};


/* Provider */
const initialData: Context = {
    hasPostRing: {} as React.MutableRefObject<boolean>,
    socketRef: {} as React.MutableRefObject<WebSocket | null>,
    base64Ref: {} as React.MutableRefObject<string | null>,
    isLoadedData: false
};

export const SocketContext = createContext<Context>(initialData);

// websocketを管理するプロバイダー
export function SocketProvider({children}: {children: ReactNode}){
    /* state, context */
    // データを取得済みかどうかを管理する
    const [isLoadedData, setIsLoadedData] = useState<boolean>(false);

    // 既にリングを追加したかどうかを管理するref
    const hasPostRing = useRef<boolean>(false);

    // リングデータをやりとりするためのwebsocketのref
    const socketRef = useRef<WebSocket | null>(null);

    // base64データを保持しておくためのref
    const base64Ref = useRef<string | null>(null);

    // リングデータをやりとりするためのcontext
    const {
        initializeLatestRing,
        setLatestRing
    } = useContext(DbContext);

    // 画面リング描画を操作するためのcontext
    const {
        initializeRingDraw,
        addedTorus,
        setUsedOrbitIndexes,
        reChoiceAddedTorus,
        usedOrbitIndexes
    } = useContext(RingContext);

    // 写真撮影(リング+カメラ)のためのcontext
    const {
        saveImage
    } = useContext(CaptureContext);

    // 設定を管理するcontext
    const {
        isTrialPage
    } = useContext(SettingsContent);

    // reduxのdispatch
    const dispatch = useDispatch<AppDispatch>();
    const torusList = useAppSelector((state) => state.torusInfo.value); // 描画に追加されているリングデータ


    /* useEffect */
    // WebSocket関連の処理は副作用なので、useEffect内で実装
    useEffect(() => {
        // WebSocketオブジェクトを生成しサーバとの接続を開始
        const wsUrl: string = isTrialPage ? TEST_WS_URL : WS_URL;
        let websocket: WebSocket = new WebSocket(wsUrl);
        console.log("websocket:", websocket);
        socketRef.current = websocket;

        // メッセージ受信時のイベントハンドラ関数
        // そのままだとreactで管理している状態を取得できないので、useState + useEffectを経由させる
        function onMessage(event: MessageEvent<any>){
            setWsEvent(event);
        }

        // websocket接続切断時のイベントハンドラ関数
        function onClose(){
            console.log("websocket接続がタイムアウトしました");
            // showErrorToast("E008"); //「サーバーとの接続が切断されました。」

            // websocket切断時、websocketに再接続する
            socketRef.current = new WebSocket(wsUrl);
            socketRef.current.addEventListener("message", onMessage);
            socketRef.current.addEventListener("close", onClose);
            console.log("websocketに再び接続しました");
        }

        // websocketインスタンスにイベントハンドラを登録する
        websocket.addEventListener("message", onMessage);
        websocket.addEventListener("close", onClose);

        // useEffectのクリーンアップの中で、WebSocketのクローズ処理を実行
        return () => {
            websocket.close();
            websocket.removeEventListener('message', onMessage);
            console.log("websocket接続が切れました");
        }
    }, [])

    // websocketのeventを監視する
    // addEventListenerを設定したタイミングの状態しか取得できないようなので、useEffect経由で状態を無理矢理取得する
    const [wsEvent, setWsEvent] = useState<MessageEvent<any> | null>(null);
    useEffect(() => {
        if(wsEvent) handleWsEvent(wsEvent);
    }, [wsEvent]);


    /* function */
    // メッセージ受信時のイベントハンドラ関数
    function handleWsEvent(event: MessageEvent<any>){
        console.log("wsOnMessage:", {event});

        // 受信したメッセージデータを処理する
        try{
            // 受け取ったレスポンスデータを取得する
            const data: any = JSON.parse(event.data);
            console.log("received data:", data);
            if(data.user) console.log("受信した送信者ID:\n", data.nonce, "\n自分の送信者ID\n", clientId);

            // エラーデータ受信時のエラーハンドリング
            if(data.error){
                switch(data.reason){
                    case CONFLICT_USER_ID_MESSAGE:
                        console.error("ユーザーIDがコンフリクトしました", data);
                        showWarnToast("I002");
                        return;
                    case CONFLICT_INDEX_MESSAGE:
                        console.error("リングデータがコンフリクトしました", data);
                        showErrorToast("E005");
                        return;
                    default:
                        console.error("エラーメッセージを受信しました", data);
                        showErrorToast("E099");
                        return;
                }
            }

            // 送信元やタイミングによって処理を行う
            if(data.rings){
                // 初回接続時の最新リングデータインスタンスの取得をした場合
                console.log("初回リングデータ読み込みを行いました");
                handleOnConnect(data);
            }else if(data.nonce && clientId === data.nonce){
                // 受け取ったレスポンスの送信元が自分の場合
                console.log("自分が送信元のリングデータを受信しました");
                handleOwnRing(data);
            }else{
                // 他人からレスポンスを受け取った場合
                console.log("他ユーザーからリングデータを受信しました");
                handleResponseRing(data);
            }
        }catch(error){
            console.error(error);
            console.error("送信されたリングデータのハンドリングエラー", event.data);
            showErrorToast("E099");
        }
    }

    // websocket接続時に最新リングデータインスタンスを取得し、画面リング描画を初期化する関数
    function handleOnConnect(data: any){
        const ringsData: RingData[] = data.rings; // リングデータの配列(0～70個)
        if(ringsData.length > positionArray.length){
            console.error("受け取ったリングデータが70個より多いです");
            return;
        }

        // 取得したリングデータで画面リング描画を初期化する
        initializeLatestRing(ringsData); // 最新リングを更新する
        initializeRingDraw(ringsData); // 画面リング描画を初期化する

        // リングデータの読み込みが終わったことを周知させる
        setIsLoadedData(true);
        console.log("isLoadedData is OK");
    }

    // 他人が送信したリングデータを受け取って画面に追加する関数
    function handleResponseRing(ringData: RingData){
        // 最新リングを更新する
        setLatestRing(ringData);

        // リングデータを使用して、3Dオブジェクトを1つ作成する
        const newTorus: TorusInfo = convertToTorus(ringData);

        // 他人のリングを描画上に生成する、あるいは自分が選択していたリングを他人のリングで置き換える
        console.log({other: ringData.indexed, own: addedTorus?.torusData.orbitIndex})
        let ringCount: number = torusList.length;
        let currentUsedOrbitIndexes: number[] = [...usedOrbitIndexes];

        if(hasPostRing.current){
            console.log("Flow1: 送信済みの場合", {ringCount: torusList.length});
            // 既に自分がリングデータを送信済みの場合
            // 現在のリング数が70個でDEIが完成している場合、描画を初期化して新たな周を始める
            if(ringCount >= positionArray.length){
                // 新しいリング1つで描画を初期化する
                dispatch(initializeTorus(newTorus));
                currentUsedOrbitIndexes = [ringData.indexed];
                ringCount = 1;
                console.log("あなたがDEIを完成させましたが、他の人がリングを追加したので新たなDEI周が開始します");
            }else{
                //リング情報をオブジェクトに詰め込みstoreへ送る
                dispatch(pushTorusInfo(newTorus));
                ringCount++;

                // 生成したリングの軌道indexを使用済みとしてstateに保存する
                currentUsedOrbitIndexes.push(ringData.indexed);
            }
            console.log("Flow1: 他人リング追加後", {ringCount, length: torusList.length});

            // 現在のリング数が70個でDEIが完成している場合、描画を初期化して新たな周を始める
            if(ringCount >= positionArray.length){
                dispatch(resetHandle());
                currentUsedOrbitIndexes = [];
                ringCount = 0;
                console.log("他の人がDEIを完成させたため、新たなDEI周が開始します");
            }
            // 他ユーザーがリングを新たに登録し、連続撮影でなくなったので新しく追加するリングを選ぶ
            const currentIndex: number = reChoiceAddedTorus(currentUsedOrbitIndexes);
            ringCount++;
            console.log("Flow1: 自分リング追加後", {ringCount, length: torusList.length});

            // 自分が生成したリングの軌道indexを使用済みとしてstateに保存する
            currentUsedOrbitIndexes.push(currentIndex);
        }else if(ringData.indexed === addedTorus?.torusData.orbitIndex){
            console.log("Flow2: 未送信で被った場合", {ringCount, length: torusList.length});
            // 他ユーザーが生成したリングが、自分が生成しようとしていたリングと被っていた場合、他ユーザーのリングで置き換える
            dispatch(replaceTorus({existedId: addedTorus.torus.id, newTorus}));

            // 現在のリング数が70個でDEIが完成している場合、描画を初期化して新たな周を始める
            if(torusList.length >= positionArray.length){
                dispatch(resetHandle());
                currentUsedOrbitIndexes = [];
                ringCount = 0;
                console.log("DEIの最後に追加しようとしていた自分のリングが他人に取られたため、新たなDEI周を開始します");
            }

            // 他ユーザーが生成したリングが、自分が生成しようとしていたリングと被っていたので、リングを選びなおす
            const currentIndex: number = reChoiceAddedTorus(currentUsedOrbitIndexes);
            ringCount++;
            console.log("追加しようとしていたリングを選び直しました");

            // 自分が生成したリングの軌道indexを使用済みとしてstateに保存する
            currentUsedOrbitIndexes.push(currentIndex);
        }else{
            console.log("Flow3: 未送信の場合", {ringCount, length: torusList.length});
            if(ringCount >= positionArray.length){
                console.error("何かがおかしい。", torusList.length)
            }

            //リング情報をオブジェクトに詰め込みstoreへ送る
            dispatch(pushTorusInfo(newTorus));
            ringCount++;

            // 生成したリングの軌道indexを使用済みとしてstateに保存する
            currentUsedOrbitIndexes.push(ringData.indexed);

            if(ringCount > positionArray.length){
                console.error("自分のリングと被ることなくリング数が70個を超えたため、リング描画を初期化して次周を開始できませんでした");
            }
        }

        // 現状の軌道index配列をstateで管理
        setUsedOrbitIndexes(currentUsedOrbitIndexes);

        // リングの送信済み状態を解除し、リングを半透明で表示させる
        hasPostRing.current = false;
        console.log("hasPostRingをfalseにしました")
    }

    // 自分が送信元のリングデータを受け取った際に、撮影処理でrefに一旦保持した画像データを送信する関数
    async function handleOwnRing(ownRingData: RingData): Promise<void>{
        if(isTrialPage){
            console.error("体験版ページは他人名義でリングを送信する設計なのに、自分名義のリングを受信しました");
            return;
        }
        if(!base64Ref.current) return;
        if(!(ownRingData.id && ownRingData.created_at)){
            console.error("自分が送信したリングデータを受け取りましたが、`id`や`created_at`が設定されていなかったので画像データを送信できませんでした", ownRingData);
            return;
        }

        // 送信用画像データオブジェクトを作成する
        const imageData: ImageData = {
            ring_id: ownRingData.id,
            created_at: ownRingData.created_at,
            image: base64Ref.current.split(',')[1] // "data:image/png;base64"は省略されて取得される
        };

        try{
            // base64形式の画像をサーバーに送信する
            await postImageData(isTrialPage, imageData);

            // 「ARリングの生成に成功しました。」というメッセージボックスを表示する
            showSuccessToast("I005");

            // 撮影した写真をダウンロードする
            saveImage(base64Ref.current);

            // latestRingを更新する
            setLatestRing(ownRingData);

            // リングデータを送信済みとしてrefを更新する
            hasPostRing.current = true;
        }catch(error){
            console.error("画像データの送信に失敗しました", error);
            showErrorToast("E004"); // 「撮影画像のアップロードに失敗」というメッセージを表示する
        }

        base64Ref.current = null;
    }

    return (
        <SocketContext.Provider
            value={{
                hasPostRing,
                socketRef,
                base64Ref,
                isLoadedData
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}