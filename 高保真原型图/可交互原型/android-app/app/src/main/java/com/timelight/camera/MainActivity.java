package com.timelight.camera;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String VIRTUAL_HOST = "appassets.androidplatform.net";
    private static final String ENTRY_URL = "https://" + VIRTUAL_HOST + "/camera/index.html";
    private static final int REQ_STARTUP_PERMISSIONS = 1000;
    private static final int REQ_CAMERA_PERMISSION = 1001;
    private static final int REQ_FILE_CHOOSER = 1002;

    private WebView webView;
    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> filePathCallback;

    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("js", "application/javascript");
        MIME_TYPES.put("mjs", "application/javascript");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("wasm", "application/wasm");
        MIME_TYPES.put("onnx", "application/octet-stream");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("txt", "text/plain");
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF1D1D1B);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new NativeBridge(), "TimeLightNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url == null || !"https".equalsIgnoreCase(url.getScheme())
                        || !VIRTUAL_HOST.equalsIgnoreCase(url.getHost())) {
                    return null;
                }
                return serveAsset(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url != null && VIRTUAL_HOST.equalsIgnoreCase(url.getHost())) {
                    return false;
                }
                if (url != null && ("http".equalsIgnoreCase(url.getScheme()) || "https".equalsIgnoreCase(url.getScheme()))) {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                if (params != null && params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(Intent.createChooser(intent, "选择照片"), REQ_FILE_CHOOSER);
                } catch (Exception e) {
                    if (filePathCallback != null) {
                        filePathCallback.onReceiveValue(null);
                        filePathCallback = null;
                    }
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(ENTRY_URL);
        }
        requestStartupPermissions();
    }

    private void requestStartupPermissions() {
        java.util.List<String> needed = new java.util.ArrayList<>();
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else if (Build.VERSION.SDK_INT <= 28) {
            if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        } else {
            if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }
        if (!needed.isEmpty()) {
            requestPermissions(needed.toArray(new String[0]), REQ_STARTUP_PERMISSIONS);
        }
    }

    private WebResourceResponse serveAsset(Uri url) {
        String path = url.getPath();
        if (path == null || path.isEmpty() || "/".equals(path) || "/index.html".equals(path)) {
            String from = url.getQueryParameter("from");
            if ("collection".equals(from)) {
                path = "/game/index.html";
            } else {
                path = "/camera/index.html";
            }
        } else if (path.endsWith("/")) {
            path = path + "index.html";
        } else if ("/camera".equals(path) || "/game".equals(path)) {
            path = path + "/index.html";
        }

        if (path.contains("..")) {
            return errorResponse(403, "Forbidden");
        }

        String assetPath = "public" + path;
        try {
            InputStream stream = getAssets().open(assetPath);
            String ext = "";
            int dot = assetPath.lastIndexOf('.');
            if (dot >= 0 && dot < assetPath.length() - 1) {
                ext = assetPath.substring(dot + 1).toLowerCase(Locale.ROOT);
            }
            String mime = MIME_TYPES.getOrDefault(ext, "application/octet-stream");
            String encoding = mime.startsWith("text/") || "application/javascript".equals(mime) || "application/json".equals(mime)
                    ? "utf-8" : null;
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cross-Origin-Resource-Policy", "same-origin");
            headers.put("Cache-Control", assetPath.contains("/inference/") ? "public, max-age=86400" : "no-cache");
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, stream);
        } catch (Exception e) {
            return errorResponse(404, "Not Found");
        }
    }

    private WebResourceResponse errorResponse(int status, String reason) {
        byte[] bytes = reason.getBytes(StandardCharsets.UTF_8);
        return new WebResourceResponse("text/plain", "utf-8", status, reason, new HashMap<>(), new ByteArrayInputStream(bytes));
    }

    private void handleWebPermission(PermissionRequest request) {
        boolean needsCamera = false;
        for (String res : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                needsCamera = true;
            }
        }
        if (needsCamera && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            if (pendingWebPermission != null) {
                pendingWebPermission.deny();
            }
            pendingWebPermission = request;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_PERMISSION);
            return;
        }
        request.grant(request.getResources());
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_STARTUP_PERMISSIONS) {
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('timelight:camera-ready'))", null));
                }
            } else {
                Toast.makeText(this, "请授予相机权限以开始拍摄", Toast.LENGTH_SHORT).show();
            }
            return;
        }
        if (requestCode == REQ_CAMERA_PERMISSION && pendingWebPermission != null) {
            PermissionRequest req = pendingWebPermission;
            pendingWebPermission = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                req.grant(req.getResources());
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('timelight:camera-ready'))", null));
                }
            } else {
                req.deny();
                Toast.makeText(this, "请授予相机权限以开始拍摄", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER || filePathCallback == null) {
            return;
        }
        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null && clip.getItemCount() > 0) {
                results = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) {
                    results[i] = clip.getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    public class NativeBridge {
        @JavascriptInterface
        public boolean saveImageToGallery(String dataUrl, String fileName) {
            return saveImageToGallery(dataUrl, fileName, false);
        }

        @JavascriptInterface
        public boolean saveImageToGallery(String dataUrl, String fileName, boolean silent) {
            try {
                if (dataUrl == null || !dataUrl.startsWith("data:")) {
                    return false;
                }
                int comma = dataUrl.indexOf(',');
                if (comma < 0) return false;
                String meta = dataUrl.substring(5, comma);
                String mime = meta.split(";")[0];
                if (mime.isEmpty()) mime = "image/png";
                String ext = mime.contains("jpeg") || mime.contains("jpg") ? ".jpg"
                        : mime.contains("webp") ? ".webp" : ".png";
                String safeName = (fileName == null || fileName.trim().isEmpty())
                        ? ("TimeLight-" + System.currentTimeMillis() + ext)
                        : fileName.replaceAll("[^a-zA-Z0-9._\\-\\u4e00-\\u9fa5]", "_");
                if (!safeName.contains(".")) safeName += ext;

                byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                long nowMs = System.currentTimeMillis();
                long nowSec = nowMs / 1000L;
                boolean saved;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, mime);
                    values.put(MediaStore.Images.Media.DATE_TAKEN, nowMs);
                    values.put(MediaStore.Images.Media.DATE_ADDED, nowSec);
                    values.put(MediaStore.Images.Media.DATE_MODIFIED, nowSec);
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/TimeLight");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                    Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return false;
                    try (OutputStream out = resolver.openOutputStream(uri)) {
                        if (out == null) return false;
                        out.write(bytes);
                    }
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                    resolver.notifyChange(uri, null);
                    saved = true;
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "TimeLight");
                    if (!dir.exists()) dir.mkdirs();
                    File outFile = new File(dir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(bytes);
                    }
                    MediaScannerConnection.scanFile(MainActivity.this, new String[]{outFile.getAbsolutePath()}, new String[]{mime}, null);
                    saved = true;
                }
                if (saved && !silent) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "已保存到系统相册", Toast.LENGTH_SHORT).show());
                }
                return saved;
            } catch (Exception e) {
                if (!silent) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "保存失败，请检查存储权限", Toast.LENGTH_SHORT).show());
                }
                return false;
            }
        }
    }
}
