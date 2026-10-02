package com.jeeva.ledgermate;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

public class BootReceiver extends BroadcastReceiver {

    public static final String WORK_NAME_PERIODIC_REMINDERS = "LedgerMate_PeriodicRemindersWork";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            // Purge downloaded APK files from cache to reclaim storage
            deleteUpdateCache(context);

            // Reschedule Periodic WorkManager Worker (every 15 minutes)
            schedulePeriodicReminderWork(context);

            // Reschedule Daily Exact Alarm (at 9:00 AM)
            AlarmReceiver.scheduleDailyReminderAlarm(context);
        }
    }

    public static void deleteUpdateCache(Context context) {
        if (context == null) return;
        try {
            java.io.File updateDir = new java.io.File(context.getCacheDir(), "updates");
            if (updateDir.exists() && updateDir.isDirectory()) {
                java.io.File[] files = updateDir.listFiles();
                if (files != null) {
                    for (java.io.File f : files) {
                        try { f.delete(); } catch (Exception ignored) {}
                    }
                }
                updateDir.delete();
            }

            java.io.File rootCache = context.getCacheDir();
            if (rootCache != null && rootCache.exists()) {
                java.io.File[] cacheFiles = rootCache.listFiles();
                if (cacheFiles != null) {
                    for (java.io.File f : cacheFiles) {
                        if (f.getName().endsWith(".apk") || f.getName().endsWith(".tmp")) {
                            try { f.delete(); } catch (Exception ignored) {}
                        }
                    }
                }
            }

            java.io.File extCache = context.getExternalCacheDir();
            if (extCache != null && extCache.exists()) {
                java.io.File[] extFiles = extCache.listFiles();
                if (extFiles != null) {
                    for (java.io.File f : extFiles) {
                        if (f.getName().endsWith(".apk") || f.getName().endsWith(".tmp")) {
                            try { f.delete(); } catch (Exception ignored) {}
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    public static void schedulePeriodicReminderWork(Context context) {
        if (context == null) return;
        try {
            PeriodicWorkRequest reminderRequest = new PeriodicWorkRequest.Builder(
                    BackgroundReminderWorker.class,
                    15,
                    TimeUnit.MINUTES
            ).build();

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_NAME_PERIODIC_REMINDERS,
                    ExistingPeriodicWorkPolicy.KEEP,
                    reminderRequest
            );
        } catch (Exception ignored) {}
    }
}
