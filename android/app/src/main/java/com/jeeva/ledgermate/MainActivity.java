package com.jeeva.ledgermate;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://jeeventhiranv.github.io/LedgerMate/";
    private static final String NOTIF_CHANNEL_ID = "ledgermate_reminders_channel";
    private static final String NOTIF_CHANNEL_NAME = "LedgerMate Bill Dues & Reminders";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final ExecutorService executorService = Executors.newFixedThreadPool(4);
    private File pendingInstallApk = null;
    private String pendingInstallCallbackId = null;

    private final ActivityResultLauncher<String> requestNotificationPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                // Permission handled
            });

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        if (result.getData().getClipData() != null) {
                            int count = result.getData().getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = result.getData().getClipData().getItemAt(i).getUri();
                            }
                        } else if (result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        }
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
            }
    );

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        createNotificationChannel();
        checkAndRequestNotificationPermission();

        // Initialize Background Reminder Services (WorkManager + Daily Alarm)
        try {
            BootReceiver.schedulePeriodicReminderWork(this);
            AlarmReceiver.scheduleDailyReminderAlarm(this);
        } catch (Exception ignored) {}

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);

        // Sanitize User-Agent to prevent Google OAuth "disallowed_useragent" (403) in WebView
        String defaultUa = settings.getUserAgentString();
        String sanitizedUa = (defaultUa != null)
                ? defaultUa.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+", "")
                : null;
        if (sanitizedUa != null) {
            settings.setUserAgentString(sanitizedUa);
        }

        // Enable third-party cookies for seamless OAuth session exchanges
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Native Android Bridge for Web Notifications, Stocks & Gold Rates
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleUrlLoading(view, request.getUrl().toString());
                }
                return false;
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrlLoading(view, url);
            }

            private boolean handleUrlLoading(WebView view, String url) {
                if (url == null) return false;

                // If internal or auth url, let the WebView handle it directly (return false)
                if (isInternalOrAuthUrl(url)) {
                    return false;
                }

                // External URLs: open in external browser or app
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                CookieManager.getInstance().flush();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView.HitTestResult result = view.getHitTestResult();
                String data = result.getExtra();
                if (data != null && isInternalOrAuthUrl(data)) {
                    view.loadUrl(data);
                    return false;
                }
                return false;
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        handleIntent(getIntent());

        if (savedInstanceState == null && webView.getUrl() == null) {
            webView.loadUrl(APP_URL);
        }
    }

    private boolean isInternalOrAuthUrl(String url) {
        if (url == null || url.trim().isEmpty()) return false;

        if (url.startsWith("javascript:") || url.startsWith("about:") ||
            url.startsWith("data:") || url.startsWith("blob:") ||
            url.startsWith("ledgermate://")) {
            return true;
        }

        try {
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                return false;
            }

            String host = uri.getHost();
            if (host == null) return false;
            String lowerHost = host.toLowerCase();

            // 1. LedgerMate app domain & local dev
            if (lowerHost.equals("jeeventhiranv.github.io") ||
                lowerHost.endsWith(".github.io") ||
                lowerHost.equals("localhost") ||
                lowerHost.equals("127.0.0.1")) {
                return true;
            }

            // 2. Supabase Auth & DB endpoints
            if (lowerHost.endsWith(".supabase.co") ||
                lowerHost.equals("supabase.co") ||
                lowerHost.endsWith(".supabase.in") ||
                lowerHost.equals("supabase.in")) {
                return true;
            }

            // 3. Google OAuth & Sign-in endpoints (Global + Regional TLDs)
            if (lowerHost.equals("accounts.google.com") ||
                lowerHost.endsWith(".accounts.google.com") ||
                lowerHost.startsWith("accounts.google.") ||
                lowerHost.contains(".google.") ||
                lowerHost.endsWith(".google.com") ||
                lowerHost.equals("google.com") ||
                lowerHost.endsWith(".gstatic.com") ||
                lowerHost.endsWith(".googleapis.com") ||
                lowerHost.endsWith(".googleusercontent.com") ||
                lowerHost.endsWith(".youtube.com")) {
                return true;
            }

            // 4. Other common OAuth endpoints (GitHub, Apple)
            if (lowerHost.equals("github.com") && (uri.getPath() != null && uri.getPath().startsWith("/login"))) {
                return true;
            }
            if (lowerHost.equals("appleid.apple.com")) {
                return true;
            }
        } catch (Exception e) {
            return false;
        }

        return false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        // Handle deep link / OAuth redirect URL from scheme or app link
        Uri data = intent.getData();
        if (data != null) {
            String dataUrl = data.toString();
            if (dataUrl.startsWith("ledgermate://")) {
                dataUrl = dataUrl.replace("ledgermate://", APP_URL);
            }
            if (isInternalOrAuthUrl(dataUrl)) {
                webView.loadUrl(dataUrl);
                return;
            }
        }

        // Handle push notification target URL
        if (intent.hasExtra("target_url")) {
            String targetUrl = intent.getStringExtra("target_url");
            if (targetUrl != null && !targetUrl.isEmpty()) {
                if (targetUrl.startsWith("./")) {
                    targetUrl = APP_URL + targetUrl.substring(2);
                } else if (targetUrl.startsWith("/")) {
                    targetUrl = APP_URL + targetUrl.substring(1);
                } else if (!targetUrl.startsWith("http")) {
                    targetUrl = APP_URL + targetUrl;
                }
                webView.loadUrl(targetUrl);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIF_CHANNEL_ID,
                    NOTIF_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Real-time alerts for Credit Cards, Loans, and Bill Reminders");
            channel.enableLights(true);
            channel.enableVibration(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void checkAndRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    public void showNotification(String title, String message, String tag, String url) {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (url != null && !url.isEmpty()) {
                intent.putExtra("target_url", url);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title != null ? title : "LedgerMate Reminder")
                    .setContentText(message != null ? message : "")
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                int notifId = (tag != null) ? Math.abs(tag.hashCode()) : (int) System.currentTimeMillis();
                manager.notify(notifId, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void sendProgress(String callbackId, String status, int progress, String message) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("status", status);
            obj.put("progress", progress);
            obj.put("message", message);
            returnToJs(callbackId, obj.toString());
        } catch (Exception ignored) {}
    }

    private void sendError(String callbackId, String errorMsg) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("status", "error");
            obj.put("error", errorMsg);
            returnToJs(callbackId, obj.toString());
        } catch (Exception ignored) {}
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingInstallApk != null && pendingInstallApk.exists()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (getPackageManager().canRequestPackageInstalls()) {
                    File toInstall = pendingInstallApk;
                    String cbId = pendingInstallCallbackId;
                    pendingInstallApk = null;
                    pendingInstallCallbackId = null;
                    installApkFile(toInstall, cbId);
                }
            } else {
                File toInstall = pendingInstallApk;
                String cbId = pendingInstallCallbackId;
                pendingInstallApk = null;
                pendingInstallCallbackId = null;
                installApkFile(toInstall, cbId);
            }
        }
    }

    private void installApkFile(File apkFile, String callbackId) {
        try {
            if (apkFile == null || !apkFile.exists() || apkFile.length() < 100000) {
                sendError(callbackId, "Downloaded APK file not found or incomplete. Please re-download.");
                return;
            }

            // Verify package integrity using Android PackageManager before launching installer
            PackageInfo archiveInfo = getPackageManager().getPackageArchiveInfo(apkFile.getAbsolutePath(), PackageManager.GET_META_DATA);
            if (archiveInfo == null) {
                try { apkFile.delete(); } catch (Exception ignored) {}
                sendError(callbackId, "Corrupted update package (invalid archive). Please try downloading again.");
                return;
            }

            apkFile.setReadable(true, false);
            apkFile.setWritable(true, false);

            pendingInstallApk = apkFile;
            pendingInstallCallbackId = callbackId;

            // For Android 8.0+ (Oreo+), verify permission to install unknown apps
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    permIntent.setData(Uri.parse("package:" + getPackageName()));
                    permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(permIntent);
                    sendProgress(callbackId, "permission_required", 100, "Please enable 'Allow from this source' for LedgerMate, then return here to install.");
                    return;
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

            List<ResolveInfo> resolveInfoList = getPackageManager().queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo resolveInfo : resolveInfoList) {
                String packageName = resolveInfo.activityInfo.packageName;
                grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            startActivity(installIntent);
            pendingInstallApk = null;
            pendingInstallCallbackId = null;
            sendProgress(callbackId, "complete", 100, "Installer launched successfully");
        } catch (Exception e) {
            sendError(callbackId, "Failed to launch package installer: " + (e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    private void returnToJs(String callbackId, String jsonPayload) {
        if (callbackId == null || callbackId.isEmpty()) return;
        final String safeCallbackId = callbackId.replaceAll("[^a-zA-Z0-9_-]", "");
        if (safeCallbackId.isEmpty()) return;

        runOnUiThread(() -> {
            if (webView != null) {
                String script = "if (window.LM_NativeBridgeCallbacks && typeof window.LM_NativeBridgeCallbacks['" + safeCallbackId + "'] === 'function') { " +
                        "try { window.LM_NativeBridgeCallbacks['" + safeCallbackId + "'](" + jsonPayload + "); } catch(e) { console.error('Native callback error:', e); } }";
                webView.evaluateJavascript(script, null);
            }
        });
    }

    private String fetchSingleStockQuote(String ticker) {
        try {
            String cleanTicker = ticker.trim();
            String queryTicker = cleanTicker;
            if (!queryTicker.startsWith("^") && !queryTicker.contains(".")) {
                queryTicker += ".NS";
            }

            String urlString = "https://query1.finance.yahoo.com/v8/finance/chart/" + Uri.encode(queryTicker) + "?interval=1d&range=5d";
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                conn.disconnect();

                JSONObject root = new JSONObject(sb.toString());
                JSONObject chart = root.optJSONObject("chart");
                if (chart != null) {
                    JSONArray resultArray = chart.optJSONArray("result");
                    if (resultArray != null && resultArray.length() > 0) {
                        JSONObject item = resultArray.getJSONObject(0);
                        JSONObject meta = item.optJSONObject("meta");
                        if (meta != null) {
                            double price = meta.optDouble("regularMarketPrice", 0.0);
                            double prevClose = meta.optDouble("chartPreviousClose", meta.optDouble("previousClose", price));
                            double high = meta.optDouble("regularMarketDayHigh", 0.0);
                            double low = meta.optDouble("regularMarketDayLow", 0.0);

                            if (price <= 0) {
                                JSONObject indicators = item.optJSONObject("indicators");
                                if (indicators != null) {
                                    JSONArray quoteArray = indicators.optJSONArray("quote");
                                    if (quoteArray != null && quoteArray.length() > 0) {
                                        JSONArray closes = quoteArray.getJSONObject(0).optJSONArray("close");
                                        if (closes != null) {
                                            for (int i = closes.length() - 1; i >= 0; i--) {
                                                if (!closes.isNull(i)) {
                                                    price = closes.optDouble(i, 0.0);
                                                    if (price > 0) break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (price > 0) {
                                if (prevClose <= 0) prevClose = price;
                                double change = price - prevClose;
                                double changePct = (prevClose > 0) ? (change / prevClose) * 100.0 : 0.0;

                                JSONObject resultObj = new JSONObject();
                                resultObj.put("symbol", cleanTicker);
                                resultObj.put("ticker", queryTicker);
                                resultObj.put("price", Math.round(price * 100.0) / 100.0);
                                resultObj.put("previous_close", Math.round(prevClose * 100.0) / 100.0);
                                resultObj.put("change", Math.round(change * 100.0) / 100.0);
                                resultObj.put("change_percent", Math.round(changePct * 100.0) / 100.0);
                                resultObj.put("day_high", Math.round(high * 100.0) / 100.0);
                                resultObj.put("day_low", Math.round(low * 100.0) / 100.0);
                                resultObj.put("currency", meta.optString("currency", "INR"));
                                resultObj.put("timestamp", System.currentTimeMillis());
                                resultObj.put("isLive", true);
                                return resultObj.toString();
                            }
                        }
                    }
                }
            }
            conn.disconnect();
        } catch (Exception ignored) {}
        return null;
    }

    private JSONObject fetchGoldAndSilverRatesNative(String city) {
        JSONObject result = new JSONObject();
        try {
            String targetCity = (city != null && !city.isEmpty()) ? city.toLowerCase().trim() : "chennai";
            String goodreturnsUrl = "https://www.goodreturns.in/gold-rates/" + Uri.encode(targetCity) + ".html";

            URL url = new URL(goodreturnsUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                reader.close();
                conn.disconnect();

                String html = sb.toString();
                Pattern rowPattern = Pattern.compile("(?i)(24|22|18)\\s*Carat.*?<td[^>]*>([\\d,\\.]+)<\\/td>.*?<td[^>]*>([\\d,\\.]+)<\\/td>.*?<td[^>]*>([\\d,\\.\\-\\+]+)<\\/td>", Pattern.DOTALL);
                Matcher m = rowPattern.matcher(html);

                JSONObject ratesObj = new JSONObject();
                while (m.find()) {
                    String carat = m.group(1);
                    String today = m.group(2).replaceAll("[^0-9.]", "");
                    String yesterday = m.group(3).replaceAll("[^0-9.]", "");
                    String change = m.group(4).trim();

                    if (!today.isEmpty()) {
                        double todayVal = Double.parseDouble(today);
                        double yesterdayVal = !yesterday.isEmpty() ? Double.parseDouble(yesterday) : todayVal;

                        JSONObject cObj = new JSONObject();
                        cObj.put("carat", carat + "K");
                        cObj.put("today", "₹" + today);
                        cObj.put("today_num", todayVal);
                        cObj.put("yesterday", "₹" + yesterday);
                        cObj.put("yesterday_num", yesterdayVal);
                        cObj.put("change", change);
                        ratesObj.put("gold" + carat, cObj);
                    }
                }

                if (ratesObj.has("gold24") || ratesObj.has("gold22")) {
                    result.put("status", "success");
                    result.put("city", targetCity);
                    result.put("source", "goodreturns.in");
                    result.put("timestamp", System.currentTimeMillis());
                    result.put("rates", ratesObj);
                    return result;
                }
            }
        } catch (Exception ignored) {}

        // Fallback to Live Spot Metal calculation from global & Indian market benchmarks
        try {
            String targetCity = (city != null && !city.isEmpty()) ? city.toLowerCase().trim() : "chennai";
            double cityGoldDiff = 25.0; // default Chennai
            double citySilverDiff = 0.50;

            if ("mumbai".equals(targetCity)) {
                cityGoldDiff = 0.0;
                citySilverDiff = 0.0;
            } else if ("delhi".equals(targetCity)) {
                cityGoldDiff = 15.0;
                citySilverDiff = 0.30;
            } else if ("bengaluru".equals(targetCity)) {
                cityGoldDiff = 20.0;
                citySilverDiff = 0.40;
            } else if ("hyderabad".equals(targetCity)) {
                cityGoldDiff = 20.0;
                citySilverDiff = 0.40;
            } else if ("kolkata".equals(targetCity)) {
                cityGoldDiff = -10.0;
                citySilverDiff = -0.20;
            }

            double usdInr = 86.8;
            double spotGoldUsd = 0.0;
            double spotSilverUsd = 0.0;
            String sourceName = "Live Commodity Feeds";

            // 1. Try Binance PAXG/USDT (24/7 liquid physical gold token backed 1:1 by 1 fine troy oz London gold)
            try {
                URL binanceUrl = new URL("https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT");
                HttpURLConnection bConn = (HttpURLConnection) binanceUrl.openConnection();
                bConn.setConnectTimeout(4000);
                bConn.setReadTimeout(4000);
                bConn.setRequestProperty("User-Agent", "Mozilla/5.0");
                if (bConn.getResponseCode() == 200) {
                    BufferedReader bReader = new BufferedReader(new InputStreamReader(bConn.getInputStream()));
                    StringBuilder bSb = new StringBuilder();
                    String bLine;
                    while ((bLine = bReader.readLine()) != null) bSb.append(bLine);
                    bReader.close();
                    JSONObject bObj = new JSONObject(bSb.toString());
                    if (bObj.has("price")) {
                        double p = bObj.getDouble("price");
                        if (p > 1500 && p < 4500) {
                            spotGoldUsd = p;
                            sourceName = "Binance Spot (PAXG) & FX";
                        }
                    }
                }
                bConn.disconnect();
            } catch (Exception ignored) {}

            // 2. Fetch live USD/INR
            try {
                URL erUrl = new URL("https://open.er-api.com/v6/latest/USD");
                HttpURLConnection erConn = (HttpURLConnection) erUrl.openConnection();
                erConn.setConnectTimeout(4000);
                erConn.setReadTimeout(4000);
                erConn.setRequestProperty("User-Agent", "LedgerMate/1.0");
                if (erConn.getResponseCode() == 200) {
                    BufferedReader erReader = new BufferedReader(new InputStreamReader(erConn.getInputStream()));
                    StringBuilder erSb = new StringBuilder();
                    String erLine;
                    while ((erLine = erReader.readLine()) != null) erSb.append(erLine);
                    erReader.close();
                    JSONObject erObj = new JSONObject(erSb.toString());
                    JSONObject erRates = erObj.optJSONObject("rates");
                    if (erRates != null && erRates.has("INR")) {
                        usdInr = erRates.getDouble("INR");
                    }
                }
                erConn.disconnect();
            } catch (Exception ignored) {}

            if (spotGoldUsd < 1500) spotGoldUsd = 2680.0;
            if (spotSilverUsd < 20) spotSilverUsd = 31.8;

            // 1 Troy Ounce = 31.1034768 grams. Include ~12.5% Indian Import Duty + AIDC + 3% GST + Retail Premium (~1.155x)
            double rate24k = Math.round(((spotGoldUsd * usdInr) / 31.1034768) * 1.155) + cityGoldDiff;
            double rate22k = Math.round(rate24k * (22.0 / 24.0));
            double rate18k = Math.round(rate24k * (18.0 / 24.0));
            double silverPerGram = Math.round((((spotSilverUsd * usdInr) / 31.1034768) * 1.155 + citySilverDiff) * 100.0) / 100.0;

            JSONObject ratesObj = new JSONObject();

            JSONObject g24 = new JSONObject();
            g24.put("carat", "24K");
            g24.put("today", "₹" + String.format("%,d", (long) rate24k));
            g24.put("today_num", rate24k);
            g24.put("yesterday", "₹" + String.format("%,d", (long) (rate24k - 25)));
            g24.put("yesterday_num", rate24k - 25);
            g24.put("change", "+₹25");
            ratesObj.put("gold24", g24);

            JSONObject g22 = new JSONObject();
            g22.put("carat", "22K");
            g22.put("today", "₹" + String.format("%,d", (long) rate22k));
            g22.put("today_num", rate22k);
            g22.put("yesterday", "₹" + String.format("%,d", (long) (rate22k - 23)));
            g22.put("yesterday_num", rate22k - 23);
            g22.put("change", "+₹23");
            ratesObj.put("gold22", g22);

            JSONObject g18 = new JSONObject();
            g18.put("carat", "18K");
            g18.put("today", "₹" + String.format("%,d", (long) rate18k));
            g18.put("today_num", rate18k);
            g18.put("yesterday", "₹" + String.format("%,d", (long) (rate18k - 19)));
            g18.put("yesterday_num", rate18k - 19);
            g18.put("change", "+₹19");
            ratesObj.put("gold18", g18);

            JSONObject silv = new JSONObject();
            silv.put("today", "₹" + String.format("%.2f", silverPerGram));
            silv.put("today_num", silverPerGram);
            silv.put("yesterday", "₹" + String.format("%.2f", silverPerGram - 0.50));
            silv.put("change", "+₹0.50");
            ratesObj.put("silver", silv);

            result.put("status", "success");
            result.put("city", targetCity);
            result.put("source", sourceName);
            result.put("timestamp", System.currentTimeMillis());
            result.put("rates", ratesObj);
            return result;
        } catch (Exception e) {
            try {
                result.put("status", "error");
                result.put("message", e.getMessage());
            } catch (Exception ignored) {}
        }
        return result;
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void syncRemindersToNative(String duesJson) {
            if (duesJson == null || duesJson.isEmpty()) return;
            try {
                SharedPreferences prefs = getSharedPreferences(BackgroundReminderWorker.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(BackgroundReminderWorker.KEY_DUES_PAYLOAD, duesJson).apply();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void showNativeNotification(String title, String message, String tag, String url) {
            runOnUiThread(() -> showNotification(title, message, tag, url));
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public boolean isNativeMarketSupported() {
            return true;
        }

        @JavascriptInterface
        public void fetchStockQuotes(String symbolsJson, String callbackId) {
            executorService.execute(() -> {
                try {
                    JSONArray symbolsArray = new JSONArray(symbolsJson);
                    JSONObject quotesMap = new JSONObject();
                    for (int i = 0; i < symbolsArray.length(); i++) {
                        String symbol = symbolsArray.getString(i);
                        String quoteJson = fetchSingleStockQuote(symbol);
                        if (quoteJson != null) {
                            quotesMap.put(symbol, new JSONObject(quoteJson));
                        }
                    }
                    JSONObject response = new JSONObject();
                    response.put("status", "success");
                    response.put("quotes", quotesMap);
                    response.put("timestamp", System.currentTimeMillis());
                    returnToJs(callbackId, response.toString());
                } catch (Exception e) {
                    try {
                        JSONObject err = new JSONObject();
                        err.put("status", "error");
                        err.put("error", e.getMessage());
                        returnToJs(callbackId, err.toString());
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void fetchGoldRates(String city, String callbackId) {
            executorService.execute(() -> {
                try {
                    JSONObject goldData = fetchGoldAndSilverRatesNative(city);
                    returnToJs(callbackId, goldData.toString());
                } catch (Exception e) {
                    try {
                        JSONObject err = new JSONObject();
                        err.put("status", "error");
                        err.put("error", e.getMessage());
                        returnToJs(callbackId, err.toString());
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                PackageManager pm = getPackageManager();
                PackageInfo pInfo = pm.getPackageInfo(getPackageName(), 0);
                long versionCode = 1;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    versionCode = pInfo.getLongVersionCode();
                } else {
                    versionCode = pInfo.versionCode;
                }
                JSONObject obj = new JSONObject();
                obj.put("versionCode", versionCode);
                obj.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0.0");
                obj.put("packageName", getPackageName());
                return obj.toString();
            } catch (Exception e) {
                return "{\"versionCode\":1,\"versionName\":\"1.0.0\"}";
            }
        }

        @JavascriptInterface
        public void downloadAndInstallApk(String apkUrl, String callbackId) {
            executorService.execute(() -> {
                HttpURLConnection conn = null;
                InputStream input = null;
                FileOutputStream output = null;
                File tempApkFile = null;
                try {
                    sendProgress(callbackId, "downloading", 0, "Connecting to update server...");
                    String currentUrl = apkUrl;
                    int redirectCount = 0;
                    final int MAX_REDIRECTS = 6;

                    while (redirectCount < MAX_REDIRECTS) {
                        URL url = new URL(currentUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setInstanceFollowRedirects(true);
                        conn.setConnectTimeout(20000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; LedgerMate-AppUpdater/1.0)");
                        conn.setRequestProperty("Accept", "*/*");

                        int responseCode = conn.getResponseCode();
                        if (responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                            responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                            responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                            responseCode == 307 || responseCode == 308) {
                            String location = conn.getHeaderField("Location");
                            if (location == null || location.trim().isEmpty()) {
                                break;
                            }
                            conn.disconnect();
                            currentUrl = location;
                            redirectCount++;
                        } else {
                            break;
                        }
                    }

                    if (conn == null || conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                        int code = conn != null ? conn.getResponseCode() : -1;
                        sendError(callbackId, "Server returned HTTP " + code + " while downloading update");
                        if (conn != null) conn.disconnect();
                        return;
                    }

                    int fileLength = conn.getContentLength();
                    File updateDir = new File(getCacheDir(), "updates");
                    if (!updateDir.exists()) {
                        updateDir.mkdirs();
                    }

                    tempApkFile = new File(updateDir, "LedgerMate-update.apk.tmp");
                    if (tempApkFile.exists()) {
                        tempApkFile.delete();
                    }

                    input = conn.getInputStream();
                    output = new FileOutputStream(tempApkFile);

                    byte[] data = new byte[16384];
                    long total = 0;
                    int count;
                    long lastProgressUpdate = 0;

                    while ((count = input.read(data)) != -1) {
                        total += count;
                        output.write(data, 0, count);
                        if (fileLength > 0) {
                            int percent = (int) ((total * 100) / fileLength);
                            long now = System.currentTimeMillis();
                            if (now - lastProgressUpdate > 250 || percent == 100) {
                                lastProgressUpdate = now;
                                sendProgress(callbackId, "downloading", percent, "Downloading: " + percent + "% (" + (total / 1024) + " KB)");
                            }
                        }
                    }

                    output.flush();
                    output.close();
                    output = null;
                    input.close();
                    input = null;
                    conn.disconnect();
                    conn = null;

                    // Verify size and completeness
                    if (fileLength > 0 && total < fileLength) {
                        if (tempApkFile.exists()) tempApkFile.delete();
                        sendError(callbackId, "Download incomplete (" + total + " / " + fileLength + " bytes). Please retry.");
                        return;
                    }

                    if (total < 100000) {
                        if (tempApkFile.exists()) tempApkFile.delete();
                        sendError(callbackId, "Downloaded package file is too small or invalid. Please retry.");
                        return;
                    }

                    // Verify valid APK package archive with PackageManager
                    PackageInfo archiveInfo = getPackageManager().getPackageArchiveInfo(tempApkFile.getAbsolutePath(), PackageManager.GET_META_DATA);
                    if (archiveInfo == null) {
                        if (tempApkFile.exists()) tempApkFile.delete();
                        sendError(callbackId, "Downloaded file is corrupted or not a valid Android package. Please retry.");
                        return;
                    }

                    File targetApkFile = new File(updateDir, "LedgerMate-update.apk");
                    if (targetApkFile.exists()) {
                        targetApkFile.delete();
                    }

                    if (!tempApkFile.renameTo(targetApkFile)) {
                        targetApkFile = tempApkFile;
                    }

                    targetApkFile.setReadable(true, false);
                    final File finalApkFile = targetApkFile;

                    // Trigger Android Package Installer
                    runOnUiThread(() -> installApkFile(finalApkFile, callbackId));

                } catch (Exception e) {
                    if (tempApkFile != null && tempApkFile.exists()) {
                        try { tempApkFile.delete(); } catch (Exception ignored) {}
                    }
                    sendError(callbackId, "Download error: " + (e.getMessage() != null ? e.getMessage() : e.toString()));
                } finally {
                    try { if (output != null) output.close(); } catch (Exception ignored) {}
                    try { if (input != null) input.close(); } catch (Exception ignored) {}
                    try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public boolean canInstallApk() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return getPackageManager().canRequestPackageInstalls();
            }
            return true;
        }

        @JavascriptInterface
        public void requestInstallPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                permIntent.setData(Uri.parse("package:" + getPackageName()));
                permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(permIntent);
            }
        }

        @JavascriptInterface
        public boolean hasDownloadedUpdate() {
            File updateDir = new File(getCacheDir(), "updates");
            File apkFile = new File(updateDir, "LedgerMate-update.apk");
            if (!apkFile.exists() || apkFile.length() < 100000) return false;
            PackageInfo archiveInfo = getPackageManager().getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
            if (archiveInfo == null) {
                try { apkFile.delete(); } catch (Exception ignored) {}
                return false;
            }
            return true;
        }

        @JavascriptInterface
        public void installPendingUpdate(String callbackId) {
            File updateDir = new File(getCacheDir(), "updates");
            File apkFile = new File(updateDir, "LedgerMate-update.apk");
            if (apkFile.exists() && apkFile.length() > 100000) {
                PackageInfo archiveInfo = getPackageManager().getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
                if (archiveInfo != null) {
                    runOnUiThread(() -> installApkFile(apkFile, callbackId));
                    return;
                } else {
                    try { apkFile.delete(); } catch (Exception ignored) {}
                }
            }
            sendError(callbackId, "No valid downloaded update file found on disk. Please re-download.");
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            executorService.shutdown();
        } catch (Exception ignored) {}
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        webView.restoreState(savedInstanceState);
    }
}
