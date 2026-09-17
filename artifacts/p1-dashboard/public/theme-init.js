// Apply the device preference before rendering; no public-site configuration is read.
(() => {
  let preference = "system";
  try { preference = localStorage.getItem("p1-business-center-theme") || "system"; } catch {}
  const dark = preference === "dark" || (preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1120" : "#f8fafc");
})();
