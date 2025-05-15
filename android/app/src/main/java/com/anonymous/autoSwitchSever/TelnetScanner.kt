package com.anonymous.autoSwitchSever.TelnetScanner

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Arguments
import java.net.InetAddress
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import android.util.Log
import com.facebook.react.bridge.ReadableArray

class TelnetScanner(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "TelnetScanner"
    }

    @ReactMethod
    fun scan(ipList: ReadableArray, port: Int, callback: Callback?) {
        val executor = Executors.newFixedThreadPool(10)
        val onlineIps = mutableListOf<String>()
        
        for (i in 0 until ipList.size()) {
            val ip = ipList.getString(i)
            executor.submit {
                try {
                    val address = InetAddress.getByName(ip)
                    val socket = Socket()
                    socket.connect(java.net.InetSocketAddress(address, port), 1000)
                    socket.close()
                    synchronized(onlineIps) {
                        onlineIps.add(ip)
                    }
                } catch (e: Exception) {
                    // 连接失败，IP不在线
                    Log.e("TelnetScaner", "IP $ip 连接失败: ${e.message}")
                }
            }
        }
        
        executor.shutdown()
        executor.awaitTermination(5, TimeUnit.SECONDS)
        
        val resultArray = Arguments.createArray()
        onlineIps.forEach { ip ->
            resultArray.pushString(ip)
        }
        
        callback?.invoke(null, resultArray)
    }
}
