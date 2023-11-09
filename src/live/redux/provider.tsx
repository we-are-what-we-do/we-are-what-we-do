import { Provider } from "react-redux";
import { store } from "./store";
import { DbProvider } from "../../providers/DbProvider";
import { SocketProvider } from "../providers/SocketProvider";

export function Providers({ children }: {children: React.ReactNode}) {
    return (
        <Provider store={store}>
            <DbProvider>
                <SocketProvider>
                    {children}
                </SocketProvider>
            </DbProvider>
        </Provider>
    )
}