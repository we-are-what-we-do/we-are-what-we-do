import { useEffect, useState } from "react";
import { getPicPaths } from "../../api/fetchAws";

interface PicListProps {
  updatePhotoCount: (count: number) => void;
}

function PicList({updatePhotoCount}: PicListProps) {
  const [picPaths, setPics] = useState<string[]>([]);

  useEffect(() => {
    getPicPaths().then(async (data: string[]) => {
      setPics(data);
      updatePhotoCount(data.length);
    })
  }, [updatePhotoCount]);

  const baseUrl = "https://we-are-what-we-do.s3.ap-northeast-1.amazonaws.com/";
  return (
    <div className="picListContainer">
      {picPaths.map((picPath, index) => (
        <img 
          key={index} 
          src={`${baseUrl}${picPath}`} 
          alt={`pic-${index}`}
          className="picListItem"/>
      ))}
    </div>
  );
}

export default PicList;
