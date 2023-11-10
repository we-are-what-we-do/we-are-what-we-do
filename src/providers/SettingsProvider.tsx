import { createContext, useState, ReactNode, useContext } from 'react';


/* 型定義 */
// contextに渡すデータの型
type SettingsContent = {
    isTrialPage: boolean;
};


/* Provider */
const initialData: SettingsContent = {
    isTrialPage: false
};

export const SettingsContent = createContext<SettingsContent>(initialData);

// 設定を司るプロバイダー
export function SettingsProvider({children, isTrialPage}: {children: ReactNode, isTrialPage: boolean}){
    return (
        <SettingsContent.Provider
            value={{
                isTrialPage
            }}
        >
            {children}
        </SettingsContent.Provider>
    );
}