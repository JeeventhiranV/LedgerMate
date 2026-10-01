package com.jeeva.ledgermate;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class BackgroundReminderWorker extends Worker {

    public static final String PREFS_NAME = "ledgermate_reminders_store";
    public static final String KEY_DUES_PAYLOAD = "active_dues_payload";
    public static final String NOTIF_CHANNEL_ID = "ledgermate_reminders_channel";
    public static final String NOTIF_CHANNEL_NAME = "LedgerMate Bill Dues & Reminders";

    public BackgroundReminderWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            evaluateAndTriggerAlerts(getApplicationContext());
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    public static void evaluateAndTriggerAlerts(Context context) {
        if (context == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String rawPayload = prefs.getString(KEY_DUES_PAYLOAD, null);
        if (rawPayload == null || rawPayload.trim().isEmpty()) return;

        createNotificationChannelIfNeeded(context);

        try {
            JSONObject root = new JSONObject(rawPayload);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            long nowMs = System.currentTimeMillis();

            // 1. Process Reminders (Bills, EMI, Utilities)
            JSONArray reminders = root.optJSONArray("reminders");
            if (reminders != null) {
                for (int i = 0; i < reminders.length(); i++) {
                    JSONObject r = reminders.getJSONObject(i);
                    boolean completed = r.optBoolean("completed", false);
                    if (completed) continue;

                    String id = r.optString("id", "rem_" + i);
                    String title = r.optString("title", "Bill Reminder");
                    String dueDate = r.optString("dueDate", "");
                    String time = r.optString("time", "");
                    String tag = r.optString("tag", "Bills");
                    String note = r.optString("note", "");

                    if (!dueDate.isEmpty()) {
                        int diffDays = calculateDiffDays(dueDate, todayStr);
                        if (diffDays <= 2) { // Overdue, Today, or next 2 days
                            String dedupeKey = "alert_rem_" + id + "_" + todayStr;
                            if (!prefs.getBoolean(dedupeKey, false)) {
                                String dueText = (diffDays < 0) ? Math.abs(diffDays) + " day(s) OVERDUE" : (diffDays == 0) ? "Due TODAY" : "Due in " + diffDays + " day(s)";
                                String notifTitle = (diffDays <= 0) ? "🚨 " + title + " (" + dueText + ")" : "⏰ " + title + " (" + dueText + ")";
                                String notifBody = (note != null && !note.isEmpty()) ? note + " · Due: " + dueDate : "Reminder for " + tag + " · Due: " + dueDate + (time.isEmpty() ? "" : " " + time);

                                showNotification(context, notifTitle, notifBody, "rem_" + id, "./#page-reminders");
                                prefs.edit().putBoolean(dedupeKey, true).apply();
                            }
                        }
                    }
                }
            }

            // 2. Process Credit Card Dues
            JSONArray creditCards = root.optJSONArray("creditCards");
            if (creditCards != null) {
                for (int i = 0; i < creditCards.length(); i++) {
                    JSONObject card = creditCards.getJSONObject(i);
                    String cardId = card.optString("id", String.valueOf(i));
                    String cardName = card.optString("card_name", "Credit Card");
                    String bankName = card.optString("bank_name", "Bank");
                    double currentDue = card.optDouble("current_due", 0.0);
                    int daysUntilDue = card.optInt("daysUntilDue", 999);
                    String nextDueDate = card.optString("nextDueDate", "");

                    if (currentDue > 0 && daysUntilDue <= 3) {
                        String dedupeKey = "alert_cc_" + cardId + "_" + todayStr;
                        if (!prefs.getBoolean(dedupeKey, false)) {
                            String dueLabel = (daysUntilDue < 0) ? Math.abs(daysUntilDue) + " day(s) OVERDUE" : (daysUntilDue == 0) ? "Due TODAY" : "Due in " + daysUntilDue + " day(s)";
                            String notifTitle = (daysUntilDue <= 0) ? "🚨 Credit Card Bill " + dueLabel : "💳 Credit Card Bill " + dueLabel;
                            String notifBody = cardName + " (" + bankName + ") · ₹" + String.format(Locale.getDefault(), "%,.2f", currentDue) + " due on " + nextDueDate;

                            showNotification(context, notifTitle, notifBody, "cc_" + cardId, "./#page-credit-cards");
                            prefs.edit().putBoolean(dedupeKey, true).apply();
                        }
                    }
                }
            }

            // 3. Process Loans Due
            JSONArray loans = root.optJSONArray("loans");
            if (loans != null) {
                for (int i = 0; i < loans.length(); i++) {
                    JSONObject loan = loans.getJSONObject(i);
                    String loanId = loan.optString("id", String.valueOf(i));
                    String person = loan.optString("person", "Contact");
                    String type = loan.optString("type", "given");
                    double total = loan.optDouble("total", 0.0);
                    int diffDays = loan.optInt("diffDays", 999);
                    String dueDate = loan.optString("dueDate", "");

                    if (total > 0 && diffDays <= 3) {
                        String dedupeKey = "alert_loan_" + loanId + "_" + todayStr;
                        if (!prefs.getBoolean(dedupeKey, false)) {
                            boolean isCollect = "given".equalsIgnoreCase(type);
                            String action = isCollect ? "Collect from " : "Repay to ";
                            String dueLabel = (diffDays < 0) ? Math.abs(diffDays) + " day(s) OVERDUE" : (diffDays == 0) ? "Due TODAY" : "Due in " + diffDays + " day(s)";
                            String notifTitle = (diffDays <= 0) ? "🚨 Loan Overdue: " + action + person : "🤝 Loan Due Soon: " + action + person;
                            String notifBody = action + person + " · ₹" + String.format(Locale.getDefault(), "%,.2f", total) + " · " + dueLabel + " (" + dueDate + ")";

                            showNotification(context, notifTitle, notifBody, "loan_" + loanId, "./#page-wealth");
                            prefs.edit().putBoolean(dedupeKey, true).apply();
                        }
                    }
                }
            }

            // 4. Process Budget Overrun Warnings
            JSONArray budgets = root.optJSONArray("budgets");
            if (budgets != null) {
                for (int i = 0; i < budgets.length(); i++) {
                    JSONObject b = budgets.getJSONObject(i);
                    String category = b.optString("category", "General");
                    int pct = b.optInt("pct", 0);
                    double spent = b.optDouble("spent", 0.0);
                    double limit = b.optDouble("limit", 0.0);
                    String month = b.optString("month", todayStr.substring(0, 7));

                    if (pct >= 100) {
                        String dedupeKey = "alert_bgt_100_" + category + "_" + month;
                        if (!prefs.getBoolean(dedupeKey, false)) {
                            String notifTitle = "🚨 Budget Exceeded: " + category;
                            String notifBody = "You have spent " + pct + "% (₹" + (long)spent + " / ₹" + (long)limit + ") of your " + category + " budget.";
                            showNotification(context, notifTitle, notifBody, "bgt_" + category, "./#page-budgets");
                            prefs.edit().putBoolean(dedupeKey, true).apply();
                        }
                    }
                }
            }

        } catch (Exception ignored) {}
    }

    private static int calculateDiffDays(String dateStr, String todayStr) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Date d1 = sdf.parse(dateStr);
            Date d2 = sdf.parse(todayStr);
            if (d1 != null && d2 != null) {
                long diffMs = d1.getTime() - d2.getTime();
                return (int) (diffMs / (1000 * 60 * 60 * 24));
            }
        } catch (Exception ignored) {}
        return 999;
    }

    public static void showNotification(Context context, String title, String message, String tag, String targetUrl) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (targetUrl != null && !targetUrl.isEmpty()) {
                intent.putExtra("target_url", targetUrl);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIF_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setContentIntent(pendingIntent);

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                int notifId = (tag != null) ? Math.abs(tag.hashCode()) : (int) System.currentTimeMillis();
                manager.notify(notifId, builder.build());
            }
        } catch (Exception ignored) {}
    }

    private static void createNotificationChannelIfNeeded(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIF_CHANNEL_ID,
                    NOTIF_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Real-time background alerts for Credit Cards, Loans, and Bill Reminders");
            channel.enableLights(true);
            channel.enableVibration(true);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
