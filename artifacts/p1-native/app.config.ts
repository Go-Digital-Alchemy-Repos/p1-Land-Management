export default {
  expo: {
    name: "P1 Field",
    slug: "p1-field",
    scheme: "p1-field",
    version: "0.1.0",
    platforms: ["ios", "android"],
    orientation: "default",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.p1landmanagement.field.development",
    },
    android: {
      package: "com.p1landmanagement.field.development",
      allowBackup: false,
    },
    plugins: [
      ["expo-sqlite", { useSQLCipher: true }],
      ["expo-secure-store", { configureAndroidBackup: true }],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Choose a project photo to attach to your assigned work.",
          cameraPermission: "Take a project photo for your assigned work.",
          microphonePermission: false,
        },
      ],
      "./plugins/private-storage.cjs",
    ],
    extra: {
      apiOrigin:
        process.env.EXPO_PUBLIC_P1_API_ORIGIN ||
        "https://p1-dashboard-staging-dashboard-staging.up.railway.app",
    },
  },
};
