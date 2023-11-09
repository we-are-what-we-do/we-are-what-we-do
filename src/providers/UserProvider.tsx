import { createContext, useState, ReactNode, useEffect, useContext, useRef } from 'react';
import { DbContext } from './DbProvider';
import { v4 as uuidv4 } from 'uuid';


/* 型定義 */
// contextに渡すデータの型
type Context = {
    userFlag: boolean;
    userIdRef: React.MutableRefObject<string | null>;
};


/* Provider */
const initialData: Context = {
    userFlag: false,
    userIdRef: {} as React.MutableRefObject<string | null>
};

export const UserContext = createContext<Context>(initialData);

// IPアドレスの状態を管理するプロバイダー
export function UserProvider({children}: {children: ReactNode}){
    /* useState, useContext等 */
    const [userFlag, setUserFlag] = useState<boolean>(false); // 現在のユーザーIDと前回登録者のユーザーIDが同じではないかどうかフラグ
    const userIdRef = useRef<string | null>(null); // ユーザーの一意ID

    // サーバーから取得したリングデータを管理するcontext
    const {
        latestRing
    } = useContext(DbContext);


    /* useEffect等 */
    // 現在のユーザーIDと前回登録者のユーザーIDを比較した結果をuserFlagにセット
    useEffect(() => {
        const currentUserId: string = getCurrentUserId();
        const isDifferentUser: boolean = compareUserId(currentUserId);
        if(!userIdRef.current) userIdRef.current = currentUserId;
        setUserFlag(isDifferentUser);

        // console.log({userId: currentUserId, userFlag: isDifferentUser, latestUserId: latestRing?.user})
    }, [latestRing]);


    /* 関数定義 */
    // 現在のユーザーIDを取得する関数
    function getCurrentUserId(): string{
        let result: string = "";

        // 現在のユーザーIDを取得
        const cashData: string | null = localStorage.getItem("user");

        if(cashData){
            result = cashData;
        }else{
            // キャッシュデータがない場合、一意なユーザーIDを作成する
            const newId: string = uuidv4();
            localStorage.setItem("user", newId); // 作成したIDをキャッシュに保存する
            result = newId;
        }

        return result;
    }

    // 現在のユーザーIDと前回登録者のユーザーIDを比較する関数
    function compareUserId(currentUserId: string): boolean{
        let result: boolean = false;

        if(latestRing?.user !== currentUserId){
            result = true;
        }

        return result;
    }


    return (
        <UserContext.Provider
            value={{
                userFlag,
                userIdRef
            }}
        >
            {children}
        </UserContext.Provider>
    );
}