import { registerRootComponent } from "expo";
import App from "./App";
import AccountScenario from "./integration/AccountScenario";
import DeviceChecks from "./integration/DeviceChecks";
registerRootComponent(
  __DEV__ && process.env.EXPO_PUBLIC_P1_NATIVE_QA === "account"
    ? AccountScenario
    : __DEV__ && process.env.EXPO_PUBLIC_P1_NATIVE_QA === "1"
      ? DeviceChecks
      : App,
);
