import "./App.css";

import TorusList from './components/TorusList';
import DisplayInfo from "./components/DisplayInfo";

import { Canvas } from '@react-three/fiber';
import { useContext, useEffect, useRef, useState } from "react";

import { useDispatch } from "react-redux";
import { AppDispatch } from "./redux/store";
import { TorusInfo, pushTorusInfo, resetHandle } from "./../redux/features/torusInfo-slice";
import { getUpdateTime } from "./redux/features/updateTime-slice";
import { RingData, convertToTorus } from "./../handleRingData";

import { DbContext, getLatestLap } from "./../providers/DbProvider";
import { FeatureCollection, Point } from "geojson";
import { getLocationConfig, getLocationJp, getRingData } from "../api/fetchDb";


function App() {
  const dispatch = useDispatch<AppDispatch>();
  
  // サーバーから取得したリングデータを管理するcontext
  const { ringsData, latestRing, initializeRingData } = useContext(DbContext);


  // リングの表示を行う
  useEffect(() => {
    initializeRingDraw();
  }, [ringsData]);


  // データ更新時、全データを取得し、リング数を取得する
  const [ringCount, setRingCount] = useState<number>(0);

  useEffect(() => {
      getRingData().then((ringsData) => {
          const newRingCount: number = Object.keys(ringsData).length;
          setRingCount(newRingCount);
      })
  }, [ringsData]);


  // 最終更新日の表示を行う
  useEffect(() => {
    initializeLatestRing();
  }, [latestRing]);


  // GeoLocationを取得する
  const geoJsonRef = useRef<FeatureCollection<Point> | null>(null); // GeoJSONデータ

  useEffect(() => {
    getLocationConfig().then((data) => {
      geoJsonRef.current = data;
    })
  }, []);


  // 最終更新場所を更新する
  const [latestLocationJp, setLatestLocationJp] = useState<string | null>(null);

  useEffect(() => {
    const geoData = geoJsonRef.current;
    if(!geoData)    return;
    if(!latestRing) return;
    const newLatestLocationJp: string | null = getLocationJp(geoData, latestRing.location);
    setLatestLocationJp(newLatestLocationJp);
  }, [latestRing]);


  // 一定時間おきにサーバーからデータを取得し、リング表示を初期化する
  useEffect(() => {
    initializeRingData();
    const intervalTime: number = 1000 * 60 * 1; // 1分置きに更新する

    const intervalFunc = setInterval(() => {
      initializeRingData();
        // console.log("リングデータを更新しました");
    }, intervalTime);
    
    return () => clearInterval(intervalFunc);
  }, []);


  /**
   * 現在のリングのデータ(ringsData)を利用し、3Dオブジェクトを初期化及び描画を行います。
   * 
   * この関数の実行時、現在表示されている3Dデータが全削除されることに留意してください。
   * 
   * @returns void
   */

  function initializeRingDraw(): void {
    dispatch(resetHandle()); // 全3Dを消去する
  
    const extractedRingData: RingData[] = getLatestLap(ringsData);
    extractedRingData.forEach((value) => {
      const newTorus: TorusInfo = convertToTorus(value);
      dispatch(pushTorusInfo(newTorus));
    });
  };


  /**
   * 最終更新日時の情報をString型でreduxのstoreへ送ります。
   * 
   * @returns void
   */

  function initializeLatestRing(): void {
    const date   = new Date(latestRing?.created_at ?? 0);
    const year   = date.getFullYear();
    const month  = date.getMonth() + 1;
    const day    = date.getDate();
    const hour   = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    
    dispatch(getUpdateTime(`${year}/${month}/${day} ${hour}:${minute}`));
  }


  return(
    <div className='canvas'>
      <Canvas camera={{ position: [0,0,8], far: 50}} >
        <color attach="background" args={[0xff000000]} /> {/*背景色*/}
        <ambientLight intensity={1} />
        <directionalLight intensity={1.5} position={[1,1,1]} />
        <directionalLight intensity={1.5} position={[1,1,-1]} />
        <pointLight intensity={1} position={[1,1,5]} />
        <pointLight intensity={1} position={[1,1,-5]} />
        <TorusList />
      </Canvas>
      <DisplayInfo ringCount={ ringCount } latestLocationJp={ latestLocationJp } />
    </div>
  );
}
export default App;