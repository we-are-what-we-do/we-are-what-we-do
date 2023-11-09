import { ReactNode, createContext, useState, useEffect, useRef } from 'react';
import { showErrorToast } from '../components/ToastHelpers';


/* 型定義 */
// contextに渡すデータの型
type CameraContext = {
    videoRef: React.RefObject<HTMLVideoElement>;
    cameraFacing: "out" | "in" | "other" | null;
    switchCameraFacing(isNotCapturing: boolean): Promise<void>;
    enableBothCamera: boolean;
};


/* Provider */
const initialData: CameraContext = {
    videoRef: {} as React.RefObject<HTMLVideoElement>,
    cameraFacing: null,
    switchCameraFacing: () => Promise.resolve(),
    enableBothCamera: false
};

export const CameraContext = createContext<CameraContext>(initialData);

// 写真撮影(リング+カメラ)のためのプロバイダー
export function CameraProvider({children}: {children: ReactNode}){
    /* useState, useContext等 */
    const [cameraFacing, setCameraFacing] = useState<"out" | "in" | "other" | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentStream, setCurrentStream] = useState<MediaStream | null>(null); // 現在のstreamを保存する
    const [enableBothCamera, setEnableBothCamera] = useState<boolean>(false); // インカメラ, アウトカメラが両方有効かどうか

    /* useEffect等 */
    // 初回レンダリング時、カメラに接続する
    useEffect(() => {
        initCamera().then((newStream) => {
            setCurrentStream(newStream);
        });
    }, []);


    /* 関数定義 */
    // カメラに初回接続する関数
    async function initCamera(): Promise<MediaStream | null>{
        // カメラ接続を試みる
        let stream: MediaStream | null = null;

        // デフォルトはアウトカメラ接続
        const outStream: MediaStream | null = await accessCamera("out");
        const enableOutStream: boolean = Boolean(outStream);
        freeUpStream(outStream);

        // アウトカメラ接続がダメなら、インカメラ接続も試す
        const inStream: MediaStream | null = await accessCamera("in");
        // const inStream: MediaStream | null = null;
        const enableInStream: boolean = Boolean(inStream);
        freeUpStream(inStream);

        // アウトカメラ接続もインカメラ接続がダメなら、デフォルトカメラ接続を試す
        let otherStream: MediaStream | null = null;
        if((!outStream) && (!inStream)){
            otherStream = await accessCamera("other");
        };
        const enableOtherStream: boolean = Boolean(otherStream);
        freeUpStream(otherStream);

        // alert(`${enableOutStream}, ${enableInStream}, ${enableOtherStream}`);

        if(enableOutStream || enableInStream || enableOtherStream){
            // いずれかのカメラ接続に成功した場合
            // console.log("カメラのアクセスに成功");
            // window.alert("カメラのアクセスに成功");

            // アウトカメラ > インカメラ > 他カメラの優先度でstreamを設定する
            if(enableOutStream){
                stream = await accessCamera("out");
                setCameraFacing("out");
            }else if(enableInStream){
                stream = await accessCamera("in");
                setCameraFacing("in");
            }else if(enableOtherStream){
                stream = await accessCamera("other");
                setCameraFacing("other");
            }

            // インカメラ, アウトカメラの両方が有効かどうかを保存しておく
            if(outStream && inStream){
                setEnableBothCamera(true);
            }

            // video要素のsrcObjectにカメラを設定する
            if(videoRef.current){
                videoRef.current.srcObject = stream;
            };
        }else{
            // アウトカメラとインカメラ両方に接続できなかった場合
            console.error("カメラのアクセスに失敗");
            showErrorToast("E001"); // 「カメラの許可が必要です」というメッセージボックスを表示する
        };
        return stream;
    }

    // インカメラ/アウトカメラを切り替える関数
    async function switchCameraFacing(isNotCapturing: boolean): Promise<void>{
        // 例外処理
        if(!isNotCapturing){
            // 撮影処理、撮影確認待機中の場合はカメラの切り替えを防止する
            console.error("撮影処理中のためカメラを切り替えられません");
            return;
        }
        if(!enableBothCamera){
            // カメラが許可されていない場合、処理しない
            console.error("両面のカメラが許可されていません");
            alert("両面のカメラが許可されていません");
            showErrorToast("E099"); // 「システムエラー」というメッセージボックスを表示する
            return;
        }
        if(!(cameraFacing === "out" || cameraFacing === "in")){
            // 現在インカメラ, アウトカメラのどちらでもない場合、処理しない
            console.error("現在使用しているカメラは、前面カメラでも背面カメラでもありません");
            alert("現在使用しているカメラは、前面カメラでも背面カメラでもありません");
            showErrorToast("E099"); // 「システムエラー」というメッセージボックスを表示する
            return;
        }

        let stream: MediaStream | null = null;
        let nextFacing: "out" | "in" = (cameraFacing === "out") ? "in" : "out"; // 切り替え先のカメラの向き

        // 直前のストリームを停止する
        await freeUpStream(currentStream);

        // カメラを切り替える
        stream = await accessCamera(nextFacing); // もう一方のカメラに接続を試みる

        if(!videoRef.current) return;
        if(stream){
            // カメラ切り替えが成功した場合、video要素のsrcObjectにカメラを設定する
            videoRef.current.srcObject = stream;
            setCameraFacing(nextFacing);
        }else{
            console.error("カメラを切り替えられませんでした");
            showErrorToast("E006"); // 「カメラの切り替えに失敗しました」というメッセージボックスを表示する
        };
    }

    // カメラにアクセスする関数
    async function accessCamera(cameraFacing: "out" | "in" | "other"): Promise<MediaStream | null>{
        let stream: MediaStream | null = null;

        // カメラに接続を試みる
        try{
            if(cameraFacing === "out"){
                // カメラの向きをアウトカメラに設定
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { exact: "environment" } // カメラの向きを設定する
                    }
                });
            }else if (cameraFacing === "in"){
                // カメラの向きをインカメラに設定
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user" // カメラの向きを設定する
                    }
                });
            }else{
                // カメラの向きを設定しない
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
            };
        }catch(error){
            // アウトカメラの接続に失敗した際のエラーハンドリング
        };

        return stream;
    }

    // streamを停止する関数
    async function freeUpStream(stream: MediaStream | null): Promise<void>{
        if(!stream) return;
        await stream.getVideoTracks().forEach((camera) => {
            camera.stop();
        });
    }


    return (
        <CameraContext.Provider
            value={{
                videoRef,
                cameraFacing,
                switchCameraFacing,
                enableBothCamera
            }}
        >
            {children}
        </CameraContext.Provider>
    );
}