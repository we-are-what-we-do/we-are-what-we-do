import "./App.css";
import { useEffect, useRef, useState } from "react";
import { Canvas } from '@react-three/fiber';
import TorusList from './TorusList';
import { RingData } from "../types";
import { getAllRingData, getLocationConfig } from "../api/fetchDb";
import Utilities from "./Utilities";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../redux/store";
import { TorusInfo, overrideTori } from '../redux/features/torusInfo-slice';
import { convertToTori } from "../handleRingData";
import { OrbitControls } from "@react-three/drei";
import { Camera, Scene, WebGLRenderer } from "three";
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

type CanvasRefInfo = {
    gl: WebGLRenderer;
    camera: Camera & { manual?: boolean | undefined; };
    scene: Scene;
}

export default function App(){
    /* stateやref */
    // リングデータを管理するstate
    const [allRings, setAllRings] = useState<RingData[][] | null>(null); // 全リングデータ
    const [enableMovingTorus, setEnableMovingTorus] = useState<boolean>(false); // リングのアニメーションを有効にするかどうか
    const [instanceIndex, setInstanceIndex] = useState<number>(0); // 現在何週目のリング周を表示しているか
    const canvasRef = useRef<CanvasRefInfo | null>(null); // Three.jsのキャンバスデータ

    // リング管理用redux
    const dispatch = useDispatch<AppDispatch>();

    /* useEffect */
    // リングデータを取得する
    useEffect(() => {
        (async() => {
            const newAllRings: RingData[][] = await getAllRingData();
            setAllRings(newAllRings);
            console.log("データの取得が完了しました");

            // リング表示を更新する
            if(newAllRings[0]){
                // リングデータをThree.jsの描画データに変換する
                const newTori: TorusInfo[] = convertToTori(newAllRings[0]);

                // 描画データをstoreに送って上書きする
                dispatch(overrideTori(newTori));
            }
        })();
    }, []);


    /* functions */
    // 表示されているリング周を上書きする関数
    function overrideInstance(index: number): void{
        // 全リングデータから指定されたリング周を切り出す
        const ringInstance = allRings?.[index];

        if(!ringInstance){
            // 指定されたリング周が見つからない場合のエラーハンドリング
            console.error("指定されたリング周が見つかりません");
            return;
        }

        // リングデータをThree.jsの描画データに変換する
        const newTori: TorusInfo[] = convertToTori(ringInstance);

        // 描画データをstoreに送って上書きする
        dispatch(overrideTori(newTori));
    }

    // 表示されているリング周を切り替える関数
    function switchInstance(switchFacing: 1 | -1): void{
        if(!allRings) return;

        // 切り替え先のリング周のインデックスを取得する
        const nextIndex: number = instanceIndex + switchFacing;

        // 存在しないリング周に切り替えようとした際のエラーハンドリング
        if(nextIndex < 0 || allRings.length <= nextIndex){
            console.error("切り替え先のリング周が存在しません");
            return;
        }

        // 表示されているリング周を切り替える
        overrideInstance(nextIndex); // 描画を切り替える
        setInstanceIndex(nextIndex); // 切り替えたインデックスをstateで保存する
    }

    // リングデータをGLTF形式orOBJ形式でエクスポートする関数
    function exportRingData(exportType: "GLTF" | "OBJ"): void{
        if(!canvasRef.current) return;
        const { scene } = canvasRef.current;

        // GLTFExporterのインスタンスを作成
        let exporter;
        if(exportType === "GLTF"){
            exporter = new GLTFExporter();
        }else{
            exporter = new OBJExporter();
        }

        // 出力する
        exporter.parse(
            scene,
            (result) => {
                let data: Blob;

                if (result instanceof ArrayBuffer) {
                  // ArrayBufferの場合、Blobに変換
                    data = new Blob([result], { type: 'application/octet-stream' });
                } else {
                  // それ以外の場合、JSON文字列に変換
                    const json = JSON.stringify(result, null, 2);
                    data = new Blob([json], { type: 'application/json' });
                }
            
                // ダウンロード用のリンクを作成
                const url = URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                if(exportType === "GLTF"){
                    link.download = 'exported_model.gltf';
                }else{
                    link.download = 'exported_model.obj';
                }
                link.click();
            
                // メモリリークを防ぐためにURLを解放
                URL.revokeObjectURL(url);
            },
            (error) => {
                console.error(error);
            }
        );
    };

    return(
        <div
            className="canvas"
            style={{ backgroundColor: "black" }}
        >
            <Canvas
                camera={{ position: [0,0,8], far: 50}}
                onCreated={({ gl, camera, scene }) => {
                    canvasRef.current = { gl, camera, scene };
                }}>
                {/* <color attach="background" args={[0xff000000]} /> */} {/*背景色*/}
                <ambientLight intensity={1} />
                <directionalLight intensity={1.5} position={[1,1,1]} />
                <directionalLight intensity={1.5} position={[1,1,-1]} />
                <pointLight intensity={1} position={[1,1,5]} />
                <pointLight intensity={1} position={[1,1,-5]} />
                <TorusList
                    enableMovingTorus={enableMovingTorus}
                />
                <OrbitControls maxDistance={50}/>
            </Canvas>
            <Utilities
                props={{
                    enableMovingTorus,
                    setEnableMovingTorus,
                    switchInstance,
                    allRings,
                    instanceIndex,
                    exportRingData
                }}
            />
        </div>
    );
}