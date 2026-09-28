// Runs in <head> before the page paints, so there's no light/dark flash on load.
// Kept outside the "use client" component so a server layout can import the string.
export const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;
