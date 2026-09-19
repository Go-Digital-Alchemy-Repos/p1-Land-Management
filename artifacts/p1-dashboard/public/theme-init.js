// One dashboard theme, applied before rendering regardless of old device preferences.
document.documentElement.dataset.theme = "light";
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f5f5f5");
