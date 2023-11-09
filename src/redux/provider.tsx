import { Provider } from "react-redux";
import { store } from "./store";
import { DbProvider } from "../providers/DbProvider";
import { RingProvider } from "../providers/RingProvider";
import { CameraProvider } from "../providers/CameraProvider";
import { CaptureProvider } from "../providers/CaptureProvider";
import { UserProvider } from "../providers/UserProvider";
import { GpsProvider } from "../providers/GpsProvider";
import { SocketProvider } from "../providers/SocketProvider";

export function Providers({ children }: {children: React.ReactNode}) {
  return (
    <Provider store={store}>
      <DbProvider>
        <UserProvider>{/* DbProvider配下にUserProviderを設置 */}
          <GpsProvider>
            <RingProvider>{/* DbProvider, UserProvider, GpsProvider配下にRingProviderを設置 */}
              <CameraProvider>
                <CaptureProvider>{/* CameraProvider配下にCaptureProviderを設置 */}
                  <SocketProvider>{/* DbProvider, UserProvider, RingProvider配下にRingProviderを設置 */}
                    {children}
                  </SocketProvider>
                </CaptureProvider>
              </CameraProvider>
            </RingProvider>
          </GpsProvider>
        </UserProvider>
      </DbProvider>
    </Provider>
  )
}