package com.jeeva.ledgermate;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
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

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://jeeventhiranv.github.io/LedgerMate/";
    private static final String NOTIF_CHANNEL_ID = "ledgermate_reminders_channel";
    private static final String NOTIF_CHANNEL_NAME = "LedgerMate Bill Dues & Reminders";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

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

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

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

        // Native Android Bridge for Web Notifications and Real-time Alerts
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

                // If internal or auth url, let the WebView handle it directly
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
                WebView newWebView = new WebView(MainActivity.this);
                WebSettings newSettings = newWebView.getSettings();
                newSettings.setJavaScriptEnabled(true);
                newSettings.setDomStorageEnabled(true);
                if (sanitizedUa != null) {
                    newSettings.setUserAgentString(sanitizedUa);
                }
                CookieManager.getInstance().setAcceptThirdPartyCookies(newWebView, true);

                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        if (req != null && req.getUrl() != null) {
                            String target = req.getUrl().toString();
                            if (isInternalOrAuthUrl(target)) {
                                view.loadUrl(target);
                                return true;
                            }
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl()));
                            } catch (Exception ignored) {}
                        }
                        return true;
                    }

                    @SuppressWarnings("deprecation")
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String target) {
                        if (isInternalOrAuthUrl(target)) {
                            view.loadUrl(target);
                            return true;
                        }
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(target)));
                        } catch (Exception ignored) {}
                        return true;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
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
            url.startsWith("data:") || url.startsWith("blob:")) {
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
                lowerHost.equals("localhost") ||
                lowerHost.equals("127.0.0.1")) {
                return true;
            }

            // 2. Supabase Auth & DB endpoints
            if (lowerHost.endsWith(".supabase.co") ||
                lowerHost.equals("supabase.co") ||
                lowerHost.endsWith(".supabase.in")) {
                return true;
            }

            // 3. Google OAuth & Sign-in endpoints
            if (lowerHost.equals("accounts.google.com") ||
                lowerHost.endsWith(".accounts.google.com") ||
                lowerHost.startsWith("accounts.google.") ||
                lowerHost.contains(".google.") ||
                lowerHost.equals("ssl.gstatic.com") ||
                lowerHost.endsWith(".gstatic.com") ||
                lowerHost.equals("apis.google.com") ||
                lowerHost.equals("play.google.com") ||
                lowerHost.endsWith(".googleusercontent.com")) {
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

    public class AndroidBridge {
        @JavascriptInterface
        public void showNativeNotification(String title, String message, String tag, String url) {
            runOnUiThread(() -> showNotification(title, message, tag, url));
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }
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
