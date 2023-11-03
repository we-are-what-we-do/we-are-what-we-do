// アプリケーションサーバーのドメイン
// export const API_DOMAIN: string = "api.wawwd.net";
export const API_DOMAIN: string = "testApi.wawwd.net";

// アプリケーションサーバーのURL
export const API_URL: string = `https://${API_DOMAIN}/`;

// 仮で使うロケーションピンのID
export const TEST_LOCATION_ID: string = "0cb31b0a-b6d7-4db6-9be3-c4dc51a9047f";

// アプリケーションサーバーのwebsocketのURL
export const WS_URL: string = `wss://${API_DOMAIN}/ws-rings?location=${TEST_LOCATION_ID}`;