import "./App.css";
import { useContext, useEffect, useRef, useState } from "react";
import { DbContext } from "./providers/DbProvider";
import { CaptureContext } from "./providers/CaptureProvider";
import { GpsContext } from "./providers/GpsProvider";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from '@react-three/fiber';
import TorusList from './components/TorusList';
import Camera from "./components/Camera";
import { ToastContainer } from 'react-toastify';
import { Vector3 } from "three";
import ButtonArea from "./components/ButtonArea";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CircularProgress } from "@mui/material";
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppSelector } from "./redux/store";
import { SocketContext } from "./providers/SocketProvider";


/* 定数定義 */
export const ICON_SIZE: string = "5rem"; // ボタンの大きさ
export const ICON_COLOR: string = "#FFFFFF"; // ボタンの色
export const DISABLED_COLOR: string = "rgba(0, 0, 0, 0.24)"; // 無効なボタンの色
export const BUTTON_MARGIN: string = "5rem"; // md以上におけるボタン間のmargin


// MUIのスタイルテーマ
const theme = createTheme({
    palette: {
        primary: {
            main: ICON_COLOR // プライマリーカラー(ボタンの色)を設定
        }
    },
    components: {
        MuiIconButton: {
            styleOverrides: {
                root: {
                    "&:disabled": {
                        color: DISABLED_COLOR
                    }
                }
            }
        }
    }
});

export default function App() {
  /* stateやcontext等 */
  // 写真撮影(リング+カメラ)のためのcontext
  const {
    canvasRef
  } = useContext(CaptureContext);

  // GPSの状態を管理するcontext
  const {
    gpsFlag,
    isLoadedGps
  } = useContext(GpsContext);

  // websocketを管理するcontext
  const {
    isLoadedData
  } = useContext(SocketContext);

  // 撮影ボタンの処理中かどうか
  const isTakingPhoto = useRef<boolean>(false);

  // 3Dの視点移動(OrbitControl)が有効かどうかを管理するstate
  const enableOrbitControl = useAppSelector((state) => state.buttonState.value);


  /* DEIの初期表示をレスポンシブに行う */
  // position-zをuseStateで管理する
  const [positionZ, setPositionZ] = useState<Vector3>(new Vector3(0,0,10));
  // コンポーネントの初回マウント時、DEIリングをレスポンシブな位置に設定する
  useEffect(() => {
    const width = window.innerWidth;
    initializePositionZ(width);
  }, []);


  /**
   * リロード時に3Dオブジェクトをレスポンシブに配置する関数です。
   * 
   * @param width window.innerWidthを渡します
   * 
   * @type void
   */
  function initializePositionZ(width: number){
    if (width >= 600 && width <= 960) {
      setPositionZ(new Vector3(0,0,10));
    } else if (width >= 450 && width <= 600) {
      setPositionZ(new Vector3(0,0,15));
    } else if (width <= 450) {
      setPositionZ(new Vector3(0,0,20));
    } else {
      setPositionZ(new Vector3(0,0,8));
    }
  }


  //OrbitControlsの初期化
  const orbitControlsRef = useRef<OrbitControlsImpl>(null!);
  /**
   * OrbitControlsのカメラ位置を初期値に戻す関数です。
   *
   * @type void
   */
  function orbitControlsReset() {
    orbitControlsRef.current.reset();
  }


  return(
    <> 
      <div id="app">
        <div className="camera">
          <Camera />
        </div>
        <div className='canvas'>
          <Canvas
            hidden={!(isLoadedData && isLoadedGps)}
            onCreated={({ gl }) => {
              gl.setClearColor(0xFF0000, 0);
              gl.autoClear = true;
              gl.clearDepth()
            }}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: positionZ }}
            ref={canvasRef}
          >
            {gpsFlag && ( // リングはピン設置箇所の近くでのみ表示される
              <TorusList isTakingPhoto={isTakingPhoto}/>
            )}
            <ambientLight intensity={1} />
            <directionalLight intensity={1.5} position={[1,1,1]} />
            <directionalLight intensity={1.5} position={[1,1,-1]} />
            <pointLight intensity={1} position={[1,1,5]} />
            <pointLight intensity={1} position={[1,1,-5]} />
            <OrbitControls enabled={!enableOrbitControl} maxDistance={50} ref={orbitControlsRef} />
          </Canvas>
          {!(isLoadedData && isLoadedGps) && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%"
              }}
            >
              <CircularProgress />
            </div>
          )}
        </div>
      </div>
      <ThemeProvider theme={theme}>
        <ButtonArea
          theme={theme}
          isTakingPhoto={isTakingPhoto}
          initializePositionZ={() => initializePositionZ(window.innerWidth)}
          orbitControlsReset={orbitControlsReset}
        />
      </ThemeProvider>
      <ToastContainer />
    </>
  );
}