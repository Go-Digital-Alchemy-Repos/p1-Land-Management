import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { AuthProtocol } from "../core/auth";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export class NativeAuth extends AuthProtocol {
  constructor(origin: string) {
    const key = async () =>
      "p1.session." +
      (await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        origin,
      ));
    super(
      origin,
      {
        read: async () => SecureStore.getItemAsync(await key(), options),
        write: async (token) =>
          SecureStore.setItemAsync(await key(), token, options),
        remove: async () => SecureStore.deleteItemAsync(await key(), options),
      },
      fetch as typeof globalThis.fetch,
    );
  }
}
