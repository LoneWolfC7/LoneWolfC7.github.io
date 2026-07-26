(() => {
  "use strict";

  const loaderFlag = "__localLive2DLoaderStarted";
  const initializedFlag = "__localLive2DInitialized";
  const runtimeSrc = "/live2dw/lib/L2Dwidget.min.js";
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  if (window[loaderFlag]) return;
  window[loaderFlag] = true;

  const styleId = "local-live2d-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = [
      "#live2d-widget{left:0!important;width:150px!important;height:300px!important}",
      "#live2dcanvas{width:150px!important;height:300px!important}",
      "@media (max-width:768px){#live2d-widget{display:none!important}}",
    ].join("");
    document.head.appendChild(style);
  }

  let runtimeRequested = false;
  let retryTimer = 0;
  let retryCount = 0;

  const initialize = () => {
    if (window[initializedFlag] || mobileQuery.matches) return;

    if (!window.L2Dwidget || typeof window.L2Dwidget.init !== "function") {
      if (retryCount < 50) {
        retryCount += 1;
        retryTimer = window.setTimeout(initialize, 100);
      } else {
        console.warn("Local Live2D runtime did not load.");
      }
      return;
    }

    window.clearTimeout(retryTimer);
    window[initializedFlag] = true;

    try {
      window.L2Dwidget.init({
        model: {
          jsonPath: "/live2dw/assets/z16.model.json",
          scale: 1,
        },
        display: {
          superSample: 2,
          position: "left",
          width: 150,
          height: 300,
          hOffset: 0,
          vOffset: -20,
        },
        mobile: {
          show: false,
          scale: 0.8,
          motion: true,
        },
        dialog: {
          enable: false,
          hitokoto: false,
        },
        log: false,
      });
    } catch (error) {
      window[initializedFlag] = false;
      console.error("Failed to initialize the local Live2D widget.", error);
    }
  };

  // The Live2D runtime (~175 KB of JS plus model textures) is pure decoration,
  // so it is fetched only after the page has fully loaded and the browser is
  // idle — and never on mobile, where the widget is hidden anyway.
  const loadRuntime = () => {
    if (runtimeRequested || window[initializedFlag] || mobileQuery.matches) return;
    runtimeRequested = true;

    if (window.L2Dwidget) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = runtimeSrc;
    script.async = true;
    script.onload = initialize;
    script.onerror = () => {
      runtimeRequested = false;
      console.warn("Local Live2D runtime failed to download.");
    };
    document.body.appendChild(script);
  };

  const whenIdle = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(loadRuntime, { timeout: 4000 });
    } else {
      window.setTimeout(loadRuntime, 1500);
    }
  };

  const handleViewportChange = () => {
    if (!mobileQuery.matches) whenIdle();
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleViewportChange);
  } else {
    mobileQuery.addListener(handleViewportChange);
  }

  if (document.readyState === "complete") {
    whenIdle();
  } else {
    window.addEventListener("load", whenIdle, { once: true });
  }
})();
