import { useContext } from "react";
import { postRingData } from './../api/fetchDb';
import { DbContext } from "../providers/DbProvider";
import { RingContext } from "./../providers/RingProvider";
import { SocketContext } from "../providers/SocketProvider";
import { RingData, convertToTorus, getAvailableIndex, getIso8601DateTime } from "../handleRingData";
import { positionArray } from "./../torusPosition";
import { GpsContext } from "../providers/GpsProvider";
import { v4 as uuidv4 } from 'uuid';
import { TEST_LOCATION_ID } from "../constants";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../redux/store";
import { TorusInfo, pushTorusInfo } from "../redux/features/torusInfo-slice";


export default function TestButtons() {
    /* useState等 */
    // サーバーから取得したリングデータを管理するcontext
    const {
        setLatestRing
    } = useContext(DbContext);

    // リングのデータを追加するためのcontext
    const {
        getRingDataToAdd,
        usedOrbitIndexes,
        addedTorus
    } = useContext(RingContext);

    // websocketを管理するcontext
    const {
        socketRef
    } = useContext(SocketContext);

    // GPSの状態を管理するcontext
    const {
        currentLatitude,
        currentLongitude
    } = useContext(GpsContext);

    // reduxのdispatch
    const dispatch = useDispatch<AppDispatch>();


    /* 関数定義 */
    // サーバーにリングを追加する処理(テスト用)
    async function testAddRing(): Promise<void>{
        let addedRingData: RingData | null = null;
        const testUser: string = uuidv4();
        console.log("testUser:", testUser)

        // 既に描画に追加したリングのデータを送信する
        addedRingData = getRingDataToAdd(addedTorus?.torusData, testUser);
        if(!addedRingData){
            console.error("追加したリングデータを取得できませんでした");
            return;
        };
        addedRingData.user = testUser;

        //サーバーにリングデータを送信する
        socketRef.current?.send(JSON.stringify(addedRingData));
        console.log("サーバーにデータを送信しました:\n", addedRingData);

        // 送信したリングを描画する(現在のやつはコンフリクトして消えるので)
        const torus: TorusInfo = convertToTorus(addedRingData);
        dispatch(pushTorusInfo(torus));

        // テスト用のstate更新
        setLatestRing(addedRingData);
    }

    return (
        <div
            style={{
                width: "100%",
                position: "absolute",
                top: "10%"
            }}
        >
            <button
                onClick={testAddRing}
                style={{
                    position: "relative"
                }}
            >
                リング追加(テスト用)
            </button>
            <br/>
            <span
                style={{
                    position: "relative",
                    color: "white"
                }}
            >
                リング数: {usedOrbitIndexes.length}/{positionArray.length}
                <br/>
                現在地: {currentLatitude}, {currentLongitude}
            </span>
        </div>
    );
};