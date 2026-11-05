package com.chatora.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Context;
import android.media.AudioManager;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

// Регистрируем наш собственный плагин прямо в MainActivity
@CapacitorPlugin(name = "AudioControl")
class AudioControlPlugin extends Plugin {
    @PluginMethod
    public void enableSpeaker(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(true);
            call.resolve();
        } else {
            call.reject("AudioManager не найден");
        }
    }

    @PluginMethod
    public void disableSpeaker(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_NORMAL);
            audioManager.setSpeakerphoneOn(false);
            call.resolve();
        } else {
            call.reject("AudioManager не найден");
        }
    }
}

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Регистрируем наш плагин
        registerPlugin(AudioControlPlugin.class);

        // Настройки WebView для звука
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings webSettings = webView.getSettings();
            webSettings.setMediaPlaybackRequiresUserGesture(false);
            webSettings.setDomStorageEnabled(true);
        }
    }
}