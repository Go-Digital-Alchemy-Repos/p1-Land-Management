const { withAppDelegate } = require("expo/config-plugins");
module.exports = (config) =>
  withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift")
      throw new Error(
        "P1 private storage requires the reviewed Swift AppDelegate.",
      );
    const marker = "// P1 private storage backup exclusion";
    if (!mod.modResults.contents.includes(marker)) {
      const target = "let delegate = ReactNativeDelegate()";
      if (!mod.modResults.contents.includes(target))
        throw new Error(
          "Cannot install P1 backup exclusion: AppDelegate template changed.",
        );
      mod.modResults.contents = mod.modResults.contents.replace(
        target,
        `${marker}
    do {
      var directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("p1-private", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
    } catch {
      fatalError("P1 private storage backup exclusion failed")
    }
    ${target}`,
      );
    }
    return mod;
  });
