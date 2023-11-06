import React from 'react';
import { INFO_MESSAGES } from '../MessageMap';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';

interface ConfirmToastProps {
  onYes: () => void;
  onNo: () => void;
}

const messageI004: string[] = INFO_MESSAGES.I004 as string[];
const messageI004y: string = INFO_MESSAGES.I004y as string;
const messageI004n: string = INFO_MESSAGES.I004n as string;

export const ConfirmToast: React.FC<ConfirmToastProps> = ({ onYes, onNo }) => {
  return(
    <Grid container
      spacing={3}
      direction="column"
      alignItems="center"
    >
      <Grid item xs={12}>
        <div className="message">
        {messageI004.map((value, index) => (
          <div key={index}>{value}</div>
        ))}
        </div>
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={onYes}
          style={{whiteSpace: "nowrap"}}
        >
          {messageI004y}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="outlined"
          onClick={onNo}
          style={{backgroundColor: "white"}}
        >
          {messageI004n}
        </Button>
      </Grid>
    </Grid>
  );
};

export default ConfirmToast;