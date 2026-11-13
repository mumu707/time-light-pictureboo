# 拾光绘本：万物有灵

拾光是一款手绘胶片相机。玩家可以从成片提取贴纸，在收藏册浏览图鉴，并用贴纸装饰立体书的不同生态。

## 本地运行

安装 Node.js 22 或更高版本，然后运行：

```sh
cd "高保真原型图/可交互原型"
npm ci
npm start
```

打开 `http://localhost:3468/` 进入相机，从相册进入收藏册和立体书。实时取景需要浏览器相机权限。拍照与本地贴纸提取无需云端 API Key；可选的图像识别见[贴纸与图鉴配置](高保真原型图/可交互原型/camera/贴纸与图鉴配置.md)。

首次运行浏览器回归测试：

```sh
npx playwright install chromium
npm test
```

## Android

在可交互原型目录运行 `npm run prepare:android`，再用 Android Studio 打开 `android-app`，使用 JDK 17 和 Android SDK 34 构建 Debug。若要签署 Release，可在本地提供 `android-app/app/timelight-release.jks`，并设置 `TIMELIGHT_KS_PASS` 和 `TIMELIGHT_KEY_PASS`。签名文件和 APK 不纳入仓库。

场景原画、可独立装载的纸模和交接文档见[设计审查](高保真原型图/可交互原型/设计审查)。
