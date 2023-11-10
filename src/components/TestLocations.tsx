import { useContext, useMemo, useState } from "react";
import { GpsContext } from "../providers/GpsProvider";
import { haversineDistance } from "../api/distanceCalculations";

export default function TestLocations(){
    /* useState等 */
    // GPSの状態を管理するcontext
    const {
        geoJson,
        currentLatitude,
        currentLongitude
    } = useContext(GpsContext);

    const [showTestLocations, setShowTestLocations] = useState<boolean>(true);

    // 全ピンまでの位置を取得する
    const locationState: {
        jpName: string;
        latitude: number;
        longitude: number;
        radius: number;
        distance: number;
    }[] = useMemo(() => {
        if(!geoJson) return [];
        if(!currentLatitude) return [];
        if(!currentLongitude) return [];

        return geoJson.features.map((feature) => {
            const jpName: string = feature.properties?.localize.jp || "不明"; // ピン位置の和名
            const [longitude, latitude] = feature.geometry.coordinates; // ピンの経度・緯度を取得する
            const distance: number = haversineDistance(currentLatitude, currentLongitude, latitude, longitude); // 2点間の距離
            const radius: number = feature.properties?.radius ?? 100; // ピン範囲の半径
            return {
                jpName,
                latitude,
                longitude,
                distance,
                radius
            }
        });
    }, []);

    return (
        <div
            style={{
                width: "100%",
                position: "absolute",
                bottom: "0%",
                zIndex: 1
            }}
        >
            <button
                onClick={() => setShowTestLocations(prev => !prev)}
                style={{
                    position: "relative"
                }}
            >
                ロケーション状態{!showTestLocations && "非"}表示
            </button>
            <div
                hidden={!showTestLocations}
            >
                {locationState.map(state => (
                    <>
                    <span
                        style={{
                            color: (state.distance <= state.radius) ? "blue" : "red"
                        }}
                    >
                        {state.jpName.substring(0, 5)}: {(Math.floor(state.distance * 10)) / 10} / {state.radius}
                    </span>
                    <br/>
                    </>
                ))}
            </div>
        </div>
    );
};