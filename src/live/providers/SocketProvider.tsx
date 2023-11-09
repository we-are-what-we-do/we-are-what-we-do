import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { WS_URL } from '../../constants';
import { DbContext } from './../../providers/DbProvider';
import { convertToTorus, RingData } from '../../handleRingData';
import { ImageData } from '../../types';
import { postImageData } from '../../api/fetchDb';
import { showErrorToast } from '../../components/ToastHelpers';
import { positionArray } from '../../torusPosition';
import { pushTorusInfo, replaceTorus, resetHandle, TorusInfo } from '../../redux/features/torusInfo-slice';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '../../redux/store';


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

    // reduxのdispatch
    const dispatch = useDispatch<AppDispatch>();
    const torusList = useAppSelector((state) => state.torusInfo.value); // 描画に追加されているリングデータ


    /* useEffect */
    // WebSocket関連の処理は副作用なので、useEffect内で実装
    useEffect(() => {
        // WebSocketオブジェクトを生成しサーバとの接続を開始
        const websocket = new WebSocket(WS_URL);
        console.log("websocket:", websocket);
        socketRef.current = websocket;

        // メッセージ受信時のイベントハンドラ関数
        // そのままだとreactで管理している状態を取得できないので、useState + useEffectを経由させる
        function onMessage(event: MessageEvent<any>){
            setWsEvent(event);
        }

        // websocketインスタンスにイベントハンドラを登録する
        websocket.addEventListener("message", onMessage);

        // useEffectのクリーンアップの中で、WebSocketのクローズ処理を実行
        return () => {
            websocket.close();
            websocket.removeEventListener('message', onMessage);
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
        const data: any = JSON.parse(event.data); // 受け取ったレスポンスデータ
        console.log("wsOnMessage:", {event, data: JSON.parse(event.data)});

        if(data.rings){
            // 初回接続時の最新リングデータインスタンスの取得をした場合
            console.log("初回リングデータ読み込みを行いました");
            handleOnConnect(data);
        }else{
            // 他人からレスポンスを受け取った場合
            console.log("他ユーザーからリングデータを受信しました");
            handleResponseRing(data);
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

        // 現在のリング数が70個でDEIが完成している場合、描画を初期化して新たな周を始める
        if(torusList.length >= positionArray.length){
            dispatch(resetHandle());
        }

        //リング情報をオブジェクトに詰め込みstoreへ送る
        dispatch(pushTorusInfo(newTorus));
    }

        /**
     * 現在のリングのデータ(ringsData)を利用し、3Dオブジェクトを初期化及び描画を行います。
     * 
     * この関数の実行時、現在表示されている3Dデータが全削除されることに留意してください。
     * 
     * @returns void
     */
    function initializeRingDraw(ringsData: RingData[]): void {
        dispatch(resetHandle()); // 全3Dを消去する
    
        ringsData.forEach((value) => {
        const newTorus: TorusInfo = convertToTorus(value);
        dispatch(pushTorusInfo(newTorus));
        });
    };

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