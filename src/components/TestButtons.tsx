import { useContext } from "react";
import { positionArray } from "./../torusPosition";
import { GpsContext } from "../providers/GpsProvider";
import { useAppSelector } from "../redux/store";


export default function TestButtons({testAddRing}: {testAddRing(): void}) {
    /* useState等 */
    // GPSの状態を管理するcontext
    const {
        currentLatitude,
        currentLongitude
    } = useContext(GpsContext);

    // redux
    const torusList = useAppSelector((state) => state.torusInfo.value);


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
                リング数: {torusList.length}/{positionArray.length}
                <br/>
                現在地: {currentLatitude}, {currentLongitude}
            </span>
        </div>
    );
};