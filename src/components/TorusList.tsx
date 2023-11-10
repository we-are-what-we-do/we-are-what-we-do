import { Sparkles } from "@react-three/drei";
import { useAppSelector } from "../redux/store";
import { RingContext } from "../providers/RingProvider";
import { SocketContext } from "../providers/SocketProvider";
import { useContext } from "react";
import { SettingsContent } from "../providers/SettingsProvider";

const TRANSPARENCY: number = 0.5; // 半透明リングの透明度

function TorusList({isTakingPhoto}: {isTakingPhoto: React.MutableRefObject<boolean>}) {
  const torusList    = useAppSelector((state) => state.torusInfo.value);

  const {
    addedTorus
  } = useContext(RingContext);

  const {
    hasPostRing
  } = useContext(SocketContext);

  const {
    isTrialPage
  } = useContext(SettingsContent);

  // リングの透明度を取得する関数
  function getTransparency(torusId: string): number{
    if(hasPostRing.current){
      // リング送信後は、不透明
      return 1;
    }else if(isTakingPhoto.current){
      // 撮影確認中は、不透明
      return 11;
    }else if(torusId === addedTorus?.torus.id){
      // 追加したリングなら、透明
      return TRANSPARENCY;
    }else{
      // 追加したリング以外は、不透明
      return 1;
    }
  }

  return (
    <>
      {torusList.map((torus) => (
        <mesh
          key={torus.id}
          position={[torus.positionX, torus.positionY, 0]}
          rotation={[torus.rotateX, torus.rotateY, 0]}
          scale={torus.scale}
        >
          <torusGeometry args={[5.5, 1.5, 40, 50]} />
          <meshStandardMaterial
            color={isTrialPage ? "rgb(255, 255, 255)" : torus.color}
            roughness={0.0}
            transparent={true}
            opacity={getTransparency(torus.id)}
          />
          {((torus.id === addedTorus?.torus.id)) && (
            <Sparkles scale={8} size={5} visible={!isTakingPhoto.current} opacity={(hasPostRing.current) ? 1 : TRANSPARENCY} />
          )}
        </mesh>
      ))}
    </>
  );
}
export default TorusList;0;