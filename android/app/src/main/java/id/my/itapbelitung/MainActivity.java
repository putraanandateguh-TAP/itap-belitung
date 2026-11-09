package id.my.itapbelitung;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.util.Locale;

/**
 * Cangkang tipis: membuka situs HTTPS iTAP yang sudah ada.
 * Tidak ada jembatan JavaScript, tidak menghapus data lokal WebView (kasir),
 * dan tautan bayar/WA dibuka di aplikasi luar.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://itapbelitung.my.id/";
    static final int FILE_REQ = 41;
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private boolean showingError;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return handleNavigation(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                showingError = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (!request.isForMainFrame() || showingError) return;
                showingError = true;
                view.loadDataWithBaseURL(HOME,
                        "<!doctype html><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">" +
                                "<title>iTAP Belitung</title><body style=\"font-family:sans-serif;background:#f3f6fb;color:#0f2a44;padding:24px\">" +
                                "<h1>iTAP Belitung</h1><p>Halaman butuh internet. Cuaca, berita, harga, dan pembayaran tidak tersedia offline.</p></body>",
                        "text/html", "utf-8", null);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "Pilih foto"), FILE_REQ);
                } catch (ActivityNotFoundException ex) {
                    fileCb = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, () -> {
                if (web.canGoBack()) web.goBack();
                else finish();
            });
        }
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if ("https".equals(scheme) && isSiteHost(uri.getHost())) return false;
        if ("https".equals(scheme) || "tel".equals(scheme) || "mailto".equals(scheme)) {
            openExternal(uri);
        }
        return true;
    }

    private boolean isSiteHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase(Locale.ROOT);
        return host.equals("itapbelitung.my.id") || host.endsWith(".itapbelitung.my.id");
    }

    private void openExternal(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException ex) {
            Toast.makeText(this, "Aplikasi untuk tautan ini tidak ada.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQ || fileCb == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
        fileCb.onReceiveValue(result);
        fileCb = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < 33 && web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
