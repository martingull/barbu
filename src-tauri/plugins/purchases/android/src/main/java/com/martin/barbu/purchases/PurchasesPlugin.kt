package com.martin.barbu.purchases

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.revenuecat.purchases.*
import com.revenuecat.purchases.interfaces.*
import com.revenuecat.purchases.models.StoreTransaction
import com.revenuecat.purchases.models.SubscriptionOption
import org.json.JSONArray
import org.json.JSONObject

@InvokeArg
class RequestArgs {
    var operation: String = ""
    var packageId: String? = null
}

@InvokeArg
class PurchasesConfig {
    var androidApiKey: String = ""
    var purchasesEnabled: Boolean = false
}

@TauriPlugin
class PurchasesPlugin(private val activity: Activity) : Plugin(activity) {
    private val options = mutableMapOf<String, SubscriptionOption>()
    private var offersFetchedAt = 0L
    private var busy = false

    @Command
    fun request(invoke: Invoke) {
        activity.runOnUiThread {
            try {
                val args = invoke.parseArgs(RequestArgs::class.java)
                val config = getConfig(PurchasesConfig::class.java)
                val available = config.androidApiKey.startsWith("goog_")
                if (args.operation == "availability") {
                    invoke.resolve(JSObject().put("available", available)
                        .put("purchasesEnabled", available && config.purchasesEnabled))
                    return@runOnUiThread
                }
                if (!available) { invoke.reject("Purchase service is not configured"); return@runOnUiThread }
                if (busy) { invoke.reject("A purchase operation is already running"); return@runOnUiThread }
                if (!Purchases.isConfigured) {
                    Purchases.configure(PurchasesConfiguration.Builder(activity.applicationContext, config.androidApiKey)
                        .entitlementVerificationMode(EntitlementVerificationMode.INFORMATIONAL)
                        .automaticDeviceIdentifierCollectionEnabled(false)
                        .diagnosticsEnabled(false)
                        .showInAppMessagesAutomatically(false)
                        .build())
                }
                when (args.operation) {
                    "customer" -> customer(invoke, false)
                    "restore" -> customer(invoke, true)
                    "offers" -> offers(invoke)
                    "purchase" -> {
                        if (!config.purchasesEnabled) invoke.reject("Purchases are disabled")
                        else purchase(invoke, args.packageId)
                    }
                    "manage" -> open(invoke, "https://play.google.com/store/account/subscriptions?package=com.martin.barbu")
                    "terms" -> open(invoke, "https://martingull.github.io/barbu/terms-of-service.html")
                    "privacy" -> open(invoke, "https://martingull.github.io/barbu/privacy-policy.html")
                    else -> invoke.reject("Unsupported purchase operation")
                }
            } catch (_: Exception) {
                busy = false
                invoke.reject("Purchase service unavailable. Please try again.")
            }
        }
    }

    private fun snapshot(info: CustomerInfo): JSObject {
        // Do not use locally computed or unsigned entitlements as server verification.
        check(info.entitlements.verification == VerificationResult.VERIFIED)
        val entitlement = info.entitlements.all["premium"]
        val active = entitlement?.isActive == true && entitlement.store == Store.PLAY_STORE
        if (active) check(entitlement?.expirationDate != null)
        return JSObject().put("verification", "verified").put("entitlement", "premium")
            .put("active", active).put("checkedAt", info.requestDate.time)
            .put("expiresAt", entitlement?.expirationDate?.time ?: JSONObject.NULL)
            .put("willRenew", entitlement?.willRenew == true)
    }

    private fun resolveCustomer(invoke: Invoke, info: CustomerInfo, outcome: String? = null) {
        busy = false
        try {
            val result = JSObject().put("customer", snapshot(info))
            if (outcome != null) result.put("outcome", outcome)
            invoke.resolve(result)
        } catch (_: Exception) {
            invoke.reject("Could not verify Premium access. Please reconnect and restore purchases.")
        }
    }

    private fun customer(invoke: Invoke, restore: Boolean) {
        busy = true
        val callback = object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) = resolveCustomer(invoke, customerInfo)
            override fun onError(error: PurchasesError) {
                busy = false
                invoke.reject("Could not check purchases. Please reconnect and try again.")
            }
        }
        if (restore) Purchases.sharedInstance.restorePurchases(callback)
        else Purchases.sharedInstance.getCustomerInfo(CacheFetchPolicy.FETCH_CURRENT, callback)
    }

    private fun offers(invoke: Invoke) {
        busy = true
        options.clear()
        Purchases.sharedInstance.getOfferings(object : ReceiveOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                val results = JSONArray()
                // Initial scope is ordinary monthly/yearly base plans, without trials or instalments.
                for (pkg in offerings.all["premium"]?.availablePackages.orEmpty()) {
                    val option = pkg.product.subscriptionOptions?.basePlan ?: continue
                    val phase = option.fullPricePhase ?: continue
                    val period = phase.billingPeriod.iso8601
                    if (option.isPrepaid || option.installmentsInfo != null || period !in listOf("P1M", "P1Y")) continue
                    options[pkg.identifier] = option
                    results.put(JSObject().put("id", pkg.identifier).put("price", phase.price.formatted)
                        .put("period", if (period == "P1M") "month" else "year"))
                }
                offersFetchedAt = SystemClock.elapsedRealtime()
                busy = false
                invoke.resolve(JSObject().put("offers", results))
            }
            override fun onError(error: PurchasesError) {
                busy = false
                invoke.reject("Could not load subscription prices. Please try again.")
            }
        })
    }

    private fun purchase(invoke: Invoke, packageId: String?) {
        val option = options[packageId]
        if (option == null || SystemClock.elapsedRealtime() - offersFetchedAt > 300_000) {
            invoke.reject("Prices need refreshing before purchase")
            return
        }
        busy = true
        Purchases.sharedInstance.purchase(PurchaseParams.Builder(activity, option).build(), object : PurchaseCallback {
            override fun onCompleted(storeTransaction: StoreTransaction, customerInfo: CustomerInfo) =
                resolveCustomer(invoke, customerInfo, "purchased")

            override fun onError(error: PurchasesError, userCancelled: Boolean) {
                busy = false
                when {
                    userCancelled -> invoke.resolve(JSObject().put("outcome", "cancelled"))
                    error.code == PurchasesErrorCode.PaymentPendingError -> invoke.resolve(JSObject().put("outcome", "pending"))
                    else -> invoke.reject("Purchase could not be completed. Restore purchases before trying again if you were charged.")
                }
            }
        })
    }

    private fun open(invoke: Invoke, url: String) {
        activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        invoke.resolve(JSObject())
    }
}
