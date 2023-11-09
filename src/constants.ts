import { v4 as uuidv4 } from 'uuid';

// アプリケーションサーバーのドメイン
// export const API_DOMAIN: string = "api.wawwd.net";
export const API_DOMAIN: string = "testApi.wawwd.net";

// アプリケーションサーバーのURL
export const API_URL: string = `https://${API_DOMAIN}/`;

// 仮で使うロケーションピンのID
export const TEST_LOCATION_ID: string = "b7d8074d-746d-43d4-86d0-0d142fe157ef";

// アプリケーションサーバーのwebsocketのURL
export const WS_URL: string = `wss://${API_DOMAIN}/ws-rings`;

// 画面識別用の一意ID
export const clientId: string = uuidv4();