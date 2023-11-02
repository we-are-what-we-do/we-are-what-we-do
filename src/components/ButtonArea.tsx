import { useContext } from "react";
import { postImageData, postRingData } from './../api/fetchDb';
import { RingData } from "../handleRingData";
import { CaptureContext } from "./../providers/CaptureProvider";
import { CameraContext } from "./../providers/CameraProvider";
import { RingContext } from "./../providers/RingProvider";
import { UserContext } from "../providers/UserProvider";
import { GpsContext } from "../providers/GpsProvider";
import { DbContext } from "../providers/DbProvider";
import { SocketContext } from "../providers/SocketProvider";
import { showErrorToast, showConfirmToast, showWarnToast, showSuccessToast } from "./ToastHelpers"
import DoubleCircleIcon from "./DoubleCircleIcon";
import { Theme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CenterFocusWeak from '@mui/icons-material/CenterFocusWeak';
import CameraRear from '@mui/icons-material/CameraRear';
import CameraFront from '@mui/icons-material/CameraFront';
import Cameraswitch from '@mui/icons-material/Cameraswitch';
import { ICON_SIZE, ICON_COLOR, DISABLED_COLOR, BUTTON_MARGIN } from "./../App";
import { useDispatch } from "react-redux";
import { AppDispatch, useAppSelector } from "../redux/store";
import { changeButtonState } from "../redux/features/buttonState-slice";
// import { v4 as uuidv4 } from "uuid";
import { ImageData } from "../types";

// ボタン類のコンポーネント
export default function ButtonArea(props: {
    theme: Theme;
    isTakingPhoto: React.MutableRefObject<boolean>;
    initializePositionZ(): void;
    orbitControlsReset(): void;
}) {
    /* useState等 */
    const {
        theme,
        isTakingPhoto,
        initializePositionZ,
        orbitControlsReset
    } = props;

    // サーバーからリングデータを取得するためのcontext
    const {
        initializeRingData,
        setLatestRing,
        isLoadedData
    } = useContext(DbContext);

    // IPの状態を管理するcontext
    const {
        userFlag
    } = useContext(UserContext);

    // GPSの状態を管理するcontext
    const {
        gpsFlag,
        isLoadedGps
    } = useContext(GpsContext);

    // リングのデータを追加するためのcontext
    const {
        getRingDataToAdd
    } = useContext(RingContext);

    // アウトカメラ/インカメラを切り替えるためのcontext
    const {
        videoRef,
        switchCameraFacing,
        cameraFacing,
        enableBothCamera
    } = useContext(CameraContext);

    // 写真撮影(リング+カメラ)のためのcontext
    const {
        captureImage,
        saveImage
    } = useContext(CaptureContext);

    // websocketを管理するcontext
    const {
        hasPostRing
    } = useContext(SocketContext);

    // 画面幅がmd以上かどうか
    const isMdScreen = useMediaQuery(() => theme.breakpoints.up("md")); // md以上

    // redux
    const dispatch = useDispatch<AppDispatch>();
    const buttonState = useAppSelector((state) => state.buttonState.value);


    /* 関数定義 */
    // 撮影ボタンを押したときの処理
    async function handleTakePhotoButton(): Promise<void>{
        // 既に撮影ボタンの処理が走っているなら、処理を中止する
        if(isTakingPhoto.current){
            console.error("既に撮影ボタンが押されています");
            return;
        };

        isTakingPhoto.current = true; // 撮影ボタンの処理中であることを記録する

        if(!gpsFlag){
            // 現在地がピンの範囲外なら、処理をやめる
            showWarnToast("I001"); // 「ARリングはピン設置箇所の近くでのみ表示されます。」というメッセージボックスを表示する
        }else if((!userFlag) || (hasPostRing.current)){
            // 連続撮影orリングを送信済みなら、処理を止める
            showWarnToast("I002"); // 「連続撮影はできません。」というメッセージボックスを表示する
        }else{
            console.log({userFlag})
            // リングが未送信状態なら、写真撮影の処理を開始する
            videoRef.current?.pause(); // カメラを一時停止する
            dispatch(changeButtonState()); // 3Dの視点を固定する

            // 撮影した写真に確認を取る
            const isPhotoOk: boolean = await showConfirmToast(); // 「撮影画像はこちらでよいですか」というメッセージボックスを表示する
            // console.log("isPhotoOk: ", isPhotoOk);

            // 撮影した写真に承諾が取れたら、サーバーにリングを送信する
            if(isPhotoOk){
                // 描画に追加したリングのデータを取得する
                const addedRingData: RingData | null = getRingDataToAdd();

                // 写真(リング+カメラ)を撮影をして、base64形式で取得する
                const newImage: string | null = captureImage();

                // エラーハンドリング
                try{
                    if(!addedRingData){
                        throw new Error("追加したリングデータを取得できませんでした");
                    };
                    if(!newImage){
                        throw new Error("写真を撮影できませんでした");
                    }
                }catch(error){
                    console.error(error);
                    videoRef.current?.play(); // カメラを再生する
                    dispatch(changeButtonState()); // 3Dの視点固定を解除する
                    isTakingPhoto.current = false; // 撮影ボタンの処理が終わったことを記録する
                    showErrorToast("E004"); // 「"撮影画像のアップロードに失敗しました。」というメッセージを表示する
                    return;
                }

                // サーバー送信用に画像データの型付けを取り除く
                const base64Str = newImage.split(',')[1]; // "data:image/png;base64"は省略されて取得される

                try{
                    // リングデータを送信する
                    // addedRingData.user = uuidv4(); // TODO テスト用のランダムユーザーIDをやめる
                    const ringResponse: Response = await postRingData(addedRingData); // サーバーにリングデータを送信する
                    const responseData = await ringResponse.json();
                    console.log({responseData})

                    // 画像データを送信する
                    if(!responseData.id) console.error("リングデータ(POST)のレスポンスにidが含まれていません\n", responseData);
                    const imageData: ImageData = { // 送信用画像データオブジェクトを作成する
                        ring_id: responseData.id,
                        created_at: addedRingData.created_at,
                        image: base64Str
                    };
                    await postImageData(imageData); // base64形式の画像をサーバーに送信する
                    console.log("サーバーにデータを送信しました:\n", addedRingData);

                    // latestRingを更新する
                    setLatestRing(addedRingData);

                    // リングデータを送信済みとしてrefを更新する
                    hasPostRing.current = true;

                    // 「ARリングの生成に成功しました。」というメッセージボックスを表示する
                    showSuccessToast("I005");

                    // 撮影した写真をダウンロードする
                    saveImage(newImage);
                }catch(error){
                    // サーバーにリングデータを送信できなかった際のエラーハンドリング
                    console.error(
                        "サーバーにデータを送信できませんでした", "\n",
                        "以下の可能性があります", "\n",
                        "- 送信しようとしたリングデータがコンフリクトを起こした", "\n",
                        "- サーバーにアクセスできない", "\n",
                        error
                    );

                    // データを更新する
                    await initializeRingData();

                    // 「再度、お試しください。」というメッセージボックスを表示する
                    showErrorToast("E005");
                }
            }else{
                // 再撮影を望む場合、処理を止める
                // console.log("撮影やり直しのために処理を中断しました");
            }

            videoRef.current?.play(); // カメラを再生する
            dispatch(changeButtonState()); // 3Dの視点固定を解除する
        }

        isTakingPhoto.current = false; // 撮影ボタンの処理が終わったことを記録する
    }


    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                justifyContent: isMdScreen ? "center" : "space-evenly",
                position: "absolute",
                bottom: "1rem",
            }}
        >
            <IconButton
                style={{
                    margin: isMdScreen ?`0 ${BUTTON_MARGIN}` : "0"
                }}
                aria-label="reset-view"
                color="primary"
                onClick={() =>{
                    if(isTakingPhoto.current) return; // 撮影ボタンの処理中なら、処理をやめる
                    orbitControlsReset();
                    initializePositionZ();
                }}
                disabled={!(isLoadedData && isLoadedGps && gpsFlag)}
            >
                <CenterFocusWeak
                    style={{
                        width: ICON_SIZE,
                        height: ICON_SIZE
                    }}
                />
            </IconButton>
            <IconButton
                style={{
                    margin: isMdScreen ?`0 ${BUTTON_MARGIN}` : "0"
                }}
                aria-label="capture-display"
                color="primary"
                onClick={handleTakePhotoButton}
                disabled={!(isLoadedData && isLoadedGps && gpsFlag)}
            >
                <DoubleCircleIcon
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    color={(isLoadedData && isLoadedGps && gpsFlag) ? ICON_COLOR : DISABLED_COLOR}
                />
            </IconButton>
            <IconButton
                style={{
                    margin: isMdScreen ?`0 ${BUTTON_MARGIN}` : "0"
                }}
                aria-label="switch-camera"
                color="primary"
                disabled={!enableBothCamera}
                onClick={() => {
                    if(isTakingPhoto.current) return; // 撮影ボタンの処理中なら、処理をやめる
                    switchCameraFacing(!buttonState)
                }}
            >
                {(cameraFacing === "out") ? (
                    <CameraFront
                        style={{
                            width: ICON_SIZE,
                            height: ICON_SIZE
                        }}
                    />
                ): ((cameraFacing === "in") ? (
                    <CameraRear
                        style={{
                            width: ICON_SIZE,
                            height: ICON_SIZE
                        }}
                    />
                ): (
                    <Cameraswitch
                        style={{
                            width: ICON_SIZE,
                            height: ICON_SIZE
                        }}
                    />
                ))}
            </IconButton>
        </div>
    );
};