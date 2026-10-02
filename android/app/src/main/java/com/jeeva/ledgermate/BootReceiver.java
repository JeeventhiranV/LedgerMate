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

            // Reschedule Periodic WorkManager Worker (every 15 minutes)
            schedulePeriodicReminderWork(context);

            // Reschedule Daily Exact Alarm (at 9:00 AM)
            AlarmReceiver.scheduleDailyReminderAlarm(context);
        }
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
