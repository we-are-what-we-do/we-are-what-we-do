import { Button, FormControlLabel, FormGroup, Switch, Grid } from "@mui/material";
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { RingData } from "../types";
import { useEffect, useState } from "react";


export default function Utilities({props}: {props: {
    enableMovingTorus: boolean;
    setEnableMovingTorus: React.Dispatch<React.SetStateAction<boolean>>;
    switchInstance(switchFacing: 1 | -1): void;
    allRings: RingData[][] | null;
    instanceIndex: number;
    exportRingData(exportType: "GLTF" | "OBJ"): void
}}){
const {
    enableMovingTorus,
    setEnableMovingTorus,
    switchInstance,
    allRings,
    instanceIndex,
    exportRingData
} = props;

    // リングが現在何週分あるかを管理する
    const [instanceLength, setInstanceLength] = useState<number | null>(null);
    useEffect(() => {
        setInstanceLength(allRings?.length ?? null);
    }, [allRings]);

    return (
        <FormGroup className="utilities">
            <FormControlLabel
                label="リングのアニメーションを有効化"
                control={
                    <Switch
                        checked={enableMovingTorus}
                        onChange={() => setEnableMovingTorus(prev => !prev)}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                }
            />
            <Grid container spacing={2}>
                <Grid item xs={3}>
                    <Button
                        variant="contained"
                        startIcon={<ArrowLeftIcon/>}
                        disabled={(instanceLength === null) || (instanceIndex <= 0)}
                        onClick={() => switchInstance(-1)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <Button
                            variant="contained"
                            onClick={() => {
                                console.log(allRings?.[instanceIndex]);
                            }}
                        >
                            リング周: {instanceIndex + 1} / {instanceLength ?? "?"}
                    </Button>
                </Grid>
                <Grid item xs={3}>
                    <Button
                        variant="contained"
                        endIcon={<ArrowRightIcon/>}
                        disabled={(instanceLength === null) || ((instanceLength ?? 0) - 1 <= instanceIndex)}
                        onClick={() => switchInstance(1)}
                    />
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                <Grid item xs={/* 6 */12}>
                    <Button
                            variant="contained"
                            color="success"
                            onClick={() => exportRingData("GLTF")}
                        >
                            データ出力(.gltf)
                    </Button>
                </Grid>
{/*                 <Grid item xs={6}>
                    <Button
                            variant="contained"
                            color="success"
                            onClick={() => exportRingData("OBJ")}
                        >
                            データ出力(.obj)
                    </Button>
                </Grid> */}
            </Grid>
        </FormGroup>
    );
}