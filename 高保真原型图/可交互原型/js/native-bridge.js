"use strict";

(() => {
  const isNative = Boolean(window.TimeLightNative) || location.hostname === "appassets.androidplatform.net";
  if (isNative) {
    document.documentElement.classList.add("apk-mode");
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
      reader.readAsDataURL(blob);
    });
  }

  async function saveBlob(blob, filename) {
    if (window.TimeLightNative?.saveImageToGallery) {
      const dataUrl = await blobToDataUrl(blob);
      const ok = window.TimeLightNative.saveImageToGallery(dataUrl, filename);
      return Boolean(ok);
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  async function saveCanvas(canvas, filename) {
    const dataUrl = canvas.toDataURL("image/png");
    if (window.TimeLightNative?.saveImageToGallery) {
      return Boolean(window.TimeLightNative.saveImageToGallery(dataUrl, filename));
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return true;
  }

  async function saveToSystemGallery(blob, filename, { silent = true } = {}) {
    if (!blob) return false;
    window.TimeLightBridge.lastGallerySave = {
      filename,
      size: blob.size || 0,
      type: blob.type || "",
      timestamp: Date.now()
    };
    if (!window.TimeLightNative?.saveImageToGallery) {
      return false;
    }
    try {
      const dataUrl = await blobToDataUrl(blob);
      const ok = window.TimeLightNative.saveImageToGallery(dataUrl, filename, Boolean(silent));
      return Boolean(ok);
    } catch {
      return false;
    }
  }

  // Intercept <a download> clicks inside Android WebView so photos & stickers save directly to system gallery
  document.addEventListener("click", (event) => {
    if (!window.TimeLightNative?.saveImageToGallery) return;
    const link = event.target.closest("a[download]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const filename = link.getAttribute("download") || `TimeLight-${Date.now()}.png`;
    if (href.startsWith("data:")) {
      event.preventDefault();
      window.TimeLightNative.saveImageToGallery(href, filename);
    } else if (href.startsWith("blob:")) {
      event.preventDefault();
      fetch(href)
        .then(r => r.blob())
        .then(blob => saveBlob(blob, filename))
        .catch(() => {});
    }
  }, true);

  window.TimeLightBridge = {
    isNative,
    lastGallerySave: null,
    saveBlob,
    saveCanvas,
    saveToSystemGallery
  };
})();
